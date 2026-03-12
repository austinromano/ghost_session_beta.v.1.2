#pragma once

#include "JuceHeader.h"
#include "../Core/AppState.h"

//==============================================================================
/**
 * WebSocket connection for Ghost Session real-time communication.
 *
 * Implements RFC 6455 WebSocket protocol over JUCE StreamingSocket.
 */
class WebSocketConnection : public juce::Thread
{
public:
    WebSocketConnection(AppState& state);
    ~WebSocketConnection() override;

    void connect();
    void disconnect();
    bool isConnected() const { return connected.load(); }

    //==============================================================================
    // Room management (session rooms)
    void joinRoom(const juce::String& sessionId);
    void leaveRoom(const juce::String& sessionId);

    //==============================================================================
    // Send methods
    void sendSessionAction(const juce::String& sessionId, const juce::var& actionData);
    void sendTransportSync(const juce::String& sessionId, double beatPosition);
    void sendAudioChunk(const juce::String& sessionId, const juce::MemoryBlock& audioData);
    void sendPresence(bool online);

    //==============================================================================
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void onSessionAction(const juce::var& actionData) {}
        virtual void onSessionStateSync(const juce::var& fullState) {}
        virtual void onTransportSync(double beatPosition, int64_t serverTimestamp) {}
        virtual void onAudioChunkReceived(const juce::MemoryBlock& audioData) {}
        virtual void onChatMessageReceived(const juce::var& messageData) {}
        virtual void onPresenceUpdate(const juce::String& userId, bool online) {}
        virtual void onConnectionStateChanged(bool connected) {}
        virtual void onInviteReceived(const juce::String& sessionCode,
                                      const juce::String& hostName) {}
    };

    void addListener(Listener* l);
    void removeListener(Listener* l);

private:
    AppState& appState;
    std::atomic<bool> connected { false };
    std::atomic<bool> shouldReconnect { true };

    int reconnectAttempts = 0;
    juce::ListenerList<Listener> listeners;
    juce::CriticalSection sendLock;
    std::vector<juce::String> pendingMessages;
    juce::CriticalSection queueLock;

    // Active socket (only valid inside run())
    juce::StreamingSocket* activeSocket = nullptr;
    juce::CriticalSection socketLock;

    void run() override;
    void sendRaw(const juce::String& json);
    void handleMessage(const juce::String& json);
    juce::String buildMessage(const juce::String& type, const juce::var& payload);

    //==============================================================================
    // WebSocket protocol helpers
    bool performHandshake(juce::StreamingSocket& sock,
                          const juce::String& host, int port, const juce::String& path);
    void sendTextFrame(juce::StreamingSocket& sock, const juce::String& text);
    bool readFrame(juce::StreamingSocket& sock, juce::String& outText, uint8_t& outOpcode);
    bool readExact(juce::StreamingSocket& sock, void* buffer, int numBytes);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(WebSocketConnection)
};
