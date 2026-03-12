#include "WebSocketConnection.h"
#include <random>

WebSocketConnection::WebSocketConnection(AppState& state)
    : Thread("GhostSession-WS"), appState(state)
{
}

WebSocketConnection::~WebSocketConnection() { disconnect(); }

void WebSocketConnection::connect()
{
    shouldReconnect.store(true);
    reconnectAttempts = 0;
    if (!isThreadRunning()) startThread();
}

void WebSocketConnection::disconnect()
{
    shouldReconnect.store(false);
    connected.store(false);

    {
        const juce::ScopedLock sl(socketLock);
        if (activeSocket != nullptr)
            activeSocket->close();
    }

    signalThreadShouldExit();
    stopThread(5000);

    juce::MessageManager::callAsync([this] {
        listeners.call(&Listener::onConnectionStateChanged, false);
    });
}

//==============================================================================
void WebSocketConnection::joinRoom(const juce::String& sessionId)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("sessionId", sessionId);
    sendRaw(buildMessage("join_room", juce::var(p)));
}

void WebSocketConnection::leaveRoom(const juce::String& sessionId)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("sessionId", sessionId);
    sendRaw(buildMessage("leave_room", juce::var(p)));
}

void WebSocketConnection::sendSessionAction(const juce::String& sessionId, const juce::var& actionData)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("sessionId", sessionId);
    p->setProperty("action", actionData);
    sendRaw(buildMessage("session_action", juce::var(p)));
}

void WebSocketConnection::sendTransportSync(const juce::String& sessionId, double beatPosition)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("sessionId", sessionId);
    p->setProperty("beat", beatPosition);
    p->setProperty("timestamp", (int64_t)juce::Time::currentTimeMillis());
    sendRaw(buildMessage("transport_sync", juce::var(p)));
}

void WebSocketConnection::sendAudioChunk(const juce::String& sessionId, const juce::MemoryBlock& audioData)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("sessionId", sessionId);
    p->setProperty("audio", audioData.toBase64Encoding());
    sendRaw(buildMessage("audio_stream", juce::var(p)));
}

void WebSocketConnection::sendPresence(bool online)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("online", online);
    sendRaw(buildMessage("presence", juce::var(p)));
}

//==============================================================================
void WebSocketConnection::addListener(Listener* l)  { listeners.add(l); }
void WebSocketConnection::removeListener(Listener* l) { listeners.remove(l); }

//==============================================================================
void WebSocketConnection::run()
{
    while (!threadShouldExit() && shouldReconnect.load())
    {
        // Parse server URL: "ws://host:port" or "ws://host"
        auto serverUrl = appState.getServerUrl();
        juce::String host = "localhost";
        int port = 3000;
        juce::String path = "/";

        // Strip protocol
        auto urlBody = serverUrl;
        if (urlBody.startsWith("ws://"))   urlBody = urlBody.substring(5);
        if (urlBody.startsWith("wss://"))  urlBody = urlBody.substring(6);

        // Extract host:port
        if (urlBody.contains(":"))
        {
            host = urlBody.upToFirstOccurrenceOf(":", false, false);
            auto portStr = urlBody.fromFirstOccurrenceOf(":", false, false)
                                  .upToFirstOccurrenceOf("/", false, false);
            port = portStr.getIntValue();
            if (port <= 0) port = 3000;
        }
        else
        {
            host = urlBody.upToFirstOccurrenceOf("/", false, false);
        }

        // Create TCP socket and connect
        juce::StreamingSocket sock;
        DBG("[WS] Connecting to " + host + ":" + juce::String(port) + "...");

        if (!sock.connect(host, port, 5000))
        {
            DBG("[WS] Connection failed, retrying...");
            reconnectAttempts++;
            int delay = juce::jmin(1000 * (1 << juce::jmin(reconnectAttempts, 5)), 30000);
            wait(delay);
            continue;
        }

        // WebSocket handshake
        if (!performHandshake(sock, host, port, path))
        {
            DBG("[WS] Handshake failed, retrying...");
            sock.close();
            reconnectAttempts++;
            wait(2000);
            continue;
        }

        // Connected!
        {
            const juce::ScopedLock sl(socketLock);
            activeSocket = &sock;
        }
        connected.store(true);
        reconnectAttempts = 0;

        DBG("[WS] Connected!");

        juce::MessageManager::callAsync([this] {
            listeners.call(&Listener::onConnectionStateChanged, true);
        });

        // Flush pending messages
        {
            const juce::ScopedLock sl(queueLock);
            for (auto& msg : pendingMessages)
                sendTextFrame(sock, msg);
            pendingMessages.clear();
        }

        // Read loop
        while (!threadShouldExit() && connected.load())
        {
            if (sock.waitUntilReady(true, 200) == 1)
            {
                juce::String text;
                uint8_t opcode = 0;

                if (readFrame(sock, text, opcode))
                {
                    if (opcode == 0x01) // Text frame
                    {
                        handleMessage(text);
                    }
                    else if (opcode == 0x08) // Close
                    {
                        DBG("[WS] Server closed connection");
                        connected.store(false);
                        break;
                    }
                    else if (opcode == 0x09) // Ping
                    {
                        // Send pong
                        sendTextFrame(sock, ""); // simplified pong
                    }
                }
                else
                {
                    // Read error — connection lost
                    DBG("[WS] Read error, disconnected");
                    connected.store(false);
                    break;
                }
            }
        }

        // Cleanup
        {
            const juce::ScopedLock sl(socketLock);
            activeSocket = nullptr;
        }
        sock.close();
        connected.store(false);

        juce::MessageManager::callAsync([this] {
            listeners.call(&Listener::onConnectionStateChanged, false);
        });

        if (shouldReconnect.load() && !threadShouldExit())
        {
            int delay = juce::jmin(1000 * (1 << juce::jmin(reconnectAttempts, 5)), 30000);
            reconnectAttempts++;
            DBG("[WS] Reconnecting in " + juce::String(delay) + "ms...");
            wait(delay);
        }
    }
}

//==============================================================================
bool WebSocketConnection::performHandshake(juce::StreamingSocket& sock,
                                            const juce::String& host, int port,
                                            const juce::String& path)
{
    // Generate random 16-byte key, base64 encode
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dist(0, 255);

    uint8_t keyBytes[16];
    for (int i = 0; i < 16; ++i)
        keyBytes[i] = (uint8_t)dist(gen);

    auto wsKey = juce::Base64::toBase64(keyBytes, 16);

    juce::String request;
    request += "GET " + path + " HTTP/1.1\r\n";
    request += "Host: " + host + ":" + juce::String(port) + "\r\n";
    request += "Upgrade: websocket\r\n";
    request += "Connection: Upgrade\r\n";
    request += "Sec-WebSocket-Key: " + wsKey + "\r\n";
    request += "Sec-WebSocket-Version: 13\r\n";

    auto token = appState.getAuthToken();
    if (token.isNotEmpty())
        request += "Authorization: Bearer " + token + "\r\n";

    request += "\r\n";

    auto requestData = request.toRawUTF8();
    int requestLen = (int)strlen(requestData);

    if (sock.write(requestData, requestLen) != requestLen)
        return false;

    // Read response (up to 4KB should be plenty for handshake)
    char response[4096] = {};
    int totalRead = 0;
    int attempts = 0;

    while (totalRead < 4095 && attempts < 50)
    {
        if (sock.waitUntilReady(true, 100) == 1)
        {
            int n = sock.read(response + totalRead, 4095 - totalRead, false);
            if (n <= 0) break;
            totalRead += n;

            // Check if we have the full header (ends with \r\n\r\n)
            if (juce::String(response).contains("\r\n\r\n"))
                break;
        }
        attempts++;
    }

    juce::String responseStr(response, (size_t)totalRead);
    return responseStr.contains("101");
}

//==============================================================================
void WebSocketConnection::sendTextFrame(juce::StreamingSocket& sock, const juce::String& text)
{
    auto utf8 = text.toRawUTF8();
    int payloadLen = (int)strlen(utf8);

    // Client frames MUST be masked (RFC 6455)
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dist(0, 255);

    uint8_t mask[4];
    for (int i = 0; i < 4; ++i)
        mask[i] = (uint8_t)dist(gen);

    std::vector<uint8_t> frame;

    // FIN + opcode (text = 0x01)
    frame.push_back(0x81);

    // Payload length + mask bit
    if (payloadLen < 126)
    {
        frame.push_back((uint8_t)(0x80 | payloadLen));
    }
    else if (payloadLen < 65536)
    {
        frame.push_back(0x80 | 126);
        frame.push_back((uint8_t)(payloadLen >> 8));
        frame.push_back((uint8_t)(payloadLen & 0xFF));
    }
    else
    {
        frame.push_back(0x80 | 127);
        for (int i = 7; i >= 0; --i)
            frame.push_back((uint8_t)((payloadLen >> (i * 8)) & 0xFF));
    }

    // Masking key
    frame.push_back(mask[0]);
    frame.push_back(mask[1]);
    frame.push_back(mask[2]);
    frame.push_back(mask[3]);

    // Masked payload
    for (int i = 0; i < payloadLen; ++i)
        frame.push_back((uint8_t)utf8[i] ^ mask[i % 4]);

    const juce::ScopedLock sl(sendLock);
    sock.write(frame.data(), (int)frame.size());
}

//==============================================================================
bool WebSocketConnection::readFrame(juce::StreamingSocket& sock,
                                     juce::String& outText, uint8_t& outOpcode)
{
    uint8_t header[2];
    if (!readExact(sock, header, 2)) return false;

    outOpcode = header[0] & 0x0F;
    bool masked = (header[1] & 0x80) != 0;
    uint64_t payloadLen = header[1] & 0x7F;

    if (payloadLen == 126)
    {
        uint8_t ext[2];
        if (!readExact(sock, ext, 2)) return false;
        payloadLen = ((uint64_t)ext[0] << 8) | ext[1];
    }
    else if (payloadLen == 127)
    {
        uint8_t ext[8];
        if (!readExact(sock, ext, 8)) return false;
        payloadLen = 0;
        for (int i = 0; i < 8; ++i)
            payloadLen = (payloadLen << 8) | ext[i];
    }

    // Safety: don't read insanely large frames
    if (payloadLen > 16 * 1024 * 1024)
        return false;

    uint8_t mask[4] = {};
    if (masked)
    {
        if (!readExact(sock, mask, 4)) return false;
    }

    std::vector<uint8_t> payload((size_t)payloadLen);
    if (payloadLen > 0)
    {
        if (!readExact(sock, payload.data(), (int)payloadLen)) return false;
    }

    // Unmask if needed
    if (masked)
    {
        for (uint64_t i = 0; i < payloadLen; ++i)
            payload[(size_t)i] ^= mask[i % 4];
    }

    outText = juce::String::fromUTF8((const char*)payload.data(), (int)payloadLen);
    return true;
}

//==============================================================================
bool WebSocketConnection::readExact(juce::StreamingSocket& sock, void* buffer, int numBytes)
{
    int totalRead = 0;
    auto* dest = static_cast<uint8_t*>(buffer);

    while (totalRead < numBytes)
    {
        if (threadShouldExit() || !connected.load())
            return false;

        int n = sock.read(dest + totalRead, numBytes - totalRead, false);
        if (n <= 0) return false;
        totalRead += n;
    }
    return true;
}

//==============================================================================
void WebSocketConnection::sendRaw(const juce::String& json)
{
    if (connected.load())
    {
        const juce::ScopedLock sl(socketLock);
        if (activeSocket != nullptr)
            sendTextFrame(*activeSocket, json);
    }
    else
    {
        const juce::ScopedLock sl(queueLock);
        pendingMessages.push_back(json);
    }
}

void WebSocketConnection::handleMessage(const juce::String& json)
{
    auto parsed = juce::JSON::parse(json);
    auto* obj = parsed.getDynamicObject();
    if (!obj) return;

    auto type = obj->getProperty("type").toString();
    auto payload = obj->getProperty("payload");

    if (type == "session_action")
    {
        juce::MessageManager::callAsync([this, payload] {
            listeners.call(&Listener::onSessionAction, payload["action"]);
        });
    }
    else if (type == "session_sync")
    {
        juce::MessageManager::callAsync([this, payload] {
            listeners.call(&Listener::onSessionStateSync, payload);
        });
    }
    else if (type == "session_ended")
    {
        juce::MessageManager::callAsync([this] {
            // Trigger disconnect/session end handling
            listeners.call(&Listener::onConnectionStateChanged, false);
        });
    }
    else if (type == "transport_sync")
    {
        double beat = (double)payload["beat"];
        int64_t ts = (int64_t)(double)payload["timestamp"];
        juce::MessageManager::callAsync([this, beat, ts] {
            listeners.call(&Listener::onTransportSync, beat, ts);
        });
    }
    else if (type == "audio_stream")
    {
        juce::MemoryBlock block;
        block.fromBase64Encoding(payload["audio"].toString());
        // Audio goes directly, not through message manager (low latency)
        listeners.call(&Listener::onAudioChunkReceived, block);
    }
    else if (type == "chat")
    {
        juce::MessageManager::callAsync([this, payload] {
            listeners.call(&Listener::onChatMessageReceived, payload);
        });
    }
    else if (type == "presence")
    {
        auto userId = payload["userId"].toString();
        bool online = (bool)payload["online"];
        juce::MessageManager::callAsync([this, userId, online] {
            listeners.call(&Listener::onPresenceUpdate, userId, online);
        });
    }
    else if (type == "invite")
    {
        auto code = payload["sessionCode"].toString();
        auto hostName = payload["hostName"].toString();
        juce::MessageManager::callAsync([this, code, hostName] {
            listeners.call(&Listener::onInviteReceived, code, hostName);
        });
    }
}

juce::String WebSocketConnection::buildMessage(const juce::String& type, const juce::var& payload)
{
    auto* msg = new juce::DynamicObject();
    msg->setProperty("type", type);
    msg->setProperty("payload", payload);
    msg->setProperty("timestamp", (int64_t)juce::Time::currentTimeMillis());
    return juce::JSON::toString(juce::var(msg));
}
