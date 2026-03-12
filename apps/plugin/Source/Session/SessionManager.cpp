#include "SessionManager.h"

//==============================================================================
SessionManager::SessionManager(AppState& state, WebSocketConnection& ws, ApiClient& api)
    : appState(state), webSocket(ws), apiClient(api)
{
    webSocket.addListener(this);
    sessionState.addListener(this);
}

SessionManager::~SessionManager()
{
    webSocket.removeListener(this);
    sessionState.removeListener(this);
}

//==============================================================================
void SessionManager::createSession(const juce::String& sessionName,
                                    double tempo, const juce::String& key,
                                    std::function<void(bool, const juce::String&)> callback)
{
    DBG("[Session] Creating session: " + sessionName + " " + juce::String(tempo) + " BPM " + key);

    auto* body = new juce::DynamicObject();
    body->setProperty("name",  sessionName);
    body->setProperty("tempo", tempo);
    body->setProperty("key",   key);

    apiClient.createSession(juce::var(body),
        [this, sessionName, tempo, key, callback = std::move(callback)]
        (const ApiClient::Response& resp)
    {
        if (resp.isSuccess())
        {
            auto code = resp.body["sessionCode"].toString();
            auto sid  = resp.body["sessionId"].toString();

            DBG("[Session] Created! Code=" + code + " ID=" + sid);

            sessionCode = code;
            hostFlag = true;

            // Initialize local session state
            sessionState.setSessionId(sid);
            sessionState.setSessionName(sessionName);
            sessionState.setTempo(tempo);
            sessionState.setKey(key);

            // Add self as host
            auto self = appState.getCurrentUser();
            self.isHost = true;
            self.isOnline = true;
            sessionState.addCollaborator(self);

            appState.setSessionId(sid);

            // Connect WebSocket to session room
            webSocket.joinRoom(sid);

            listeners.call(&SessionManager::Listener::onSessionCreated, sessionCode);
            if (callback) callback(true, sessionCode);
        }
        else
        {
            DBG("[Session] Create failed: " + resp.error);
            listeners.call(&SessionManager::Listener::onSessionError, resp.error);
            if (callback) callback(false, resp.error);
        }
    });
}

void SessionManager::joinSession(const juce::String& code,
                                  std::function<void(bool, const juce::String&)> callback)
{
    DBG("[Session] Joining session: " + code);

    auto* body = new juce::DynamicObject();
    body->setProperty("sessionCode", code);

    apiClient.joinSession(juce::var(body),
        [this, code, callback = std::move(callback)](const ApiClient::Response& resp)
    {
        if (resp.isSuccess())
        {
            sessionCode = code;
            hostFlag = false;

            // Server sends full state snapshot on join
            if (resp.body.hasProperty("state"))
                sessionState.deserializeFullState(resp.body["state"]);

            appState.setSessionId(sessionState.getSessionId());

            // Add self as collaborator
            auto self = appState.getCurrentUser();
            self.isOnline = true;
            sessionState.addCollaborator(self);

            // Connect to session room
            webSocket.joinRoom(sessionState.getSessionId());

            // Broadcast our arrival
            broadcastAction(SessionState::Action::Type::AddCollaborator,
                            self.toVar());

            DBG("[Session] Joined! ID=" + sessionState.getSessionId());
            listeners.call(&SessionManager::Listener::onSessionJoined);
            if (callback) callback(true, {});
        }
        else
        {
            juce::String error = resp.error.isEmpty() ? "Session not found" : resp.error;
            DBG("[Session] Join failed: " + error);
            listeners.call(&SessionManager::Listener::onSessionError, error);
            if (callback) callback(false, error);
        }
    });
}

void SessionManager::leaveSession()
{
    if (!isInSession()) return;

    broadcastAction(SessionState::Action::Type::RemoveCollaborator,
        [&] {
            auto* obj = new juce::DynamicObject();
            obj->setProperty("userId", appState.getCurrentUser().userId);
            return juce::var(obj);
        }());

    if (hostFlag)
        endSession();
    else
        webSocket.leaveRoom(sessionState.getSessionId());

    sessionState.reset();
    sessionCode.clear();
    hostFlag = false;
    appState.setSessionId({});

    listeners.call(&SessionManager::Listener::onSessionEnded);
}

void SessionManager::endSession()
{
    if (!isInSession() || !hostFlag) return;

    apiClient.endSession(sessionState.getSessionId(), [](const ApiClient::Response&) {});
    webSocket.leaveRoom(sessionState.getSessionId());
}

void SessionManager::inviteProducer(const juce::String& usernameOrEmail)
{
    auto* body = new juce::DynamicObject();
    body->setProperty("sessionCode", sessionCode);
    body->setProperty("target", usernameOrEmail);

    apiClient.inviteToSession(juce::var(body), [this](const ApiClient::Response& resp)
    {
        if (!resp.isSuccess())
            listeners.call(&SessionManager::Listener::onSessionError, "Invite failed: " + resp.error);
    });
}

//==============================================================================
// Session actions
void SessionManager::setTempo(double bpm)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("bpm", bpm);
    broadcastAction(SessionState::Action::Type::SetTempo, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::SetTempo;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::setKey(const juce::String& key)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("key", key);
    broadcastAction(SessionState::Action::Type::SetKey, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::SetKey;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::setTimeSignature(int num, int den)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("num", num);
    p->setProperty("den", den);
    broadcastAction(SessionState::Action::Type::SetTimeSignature, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::SetTimeSignature;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::play()
{
    broadcastAction(SessionState::Action::Type::Play, {});
    SessionState::Action action;
    action.type = SessionState::Action::Type::Play;
    action.actorUserId = appState.getCurrentUser().userId;
    sessionState.applyAction(action);
}

void SessionManager::stop()
{
    broadcastAction(SessionState::Action::Type::Stop, {});
    SessionState::Action action;
    action.type = SessionState::Action::Type::Stop;
    action.actorUserId = appState.getCurrentUser().userId;
    sessionState.applyAction(action);
}

void SessionManager::seek(double positionBeats)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("beats", positionBeats);
    broadcastAction(SessionState::Action::Type::Seek, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::Seek;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::addTrack(const juce::String& name, SessionTrack::TrackType type,
                               const juce::String& fileId, const juce::String& fileName,
                               double bpm, const juce::String& key)
{
    auto* p = new juce::DynamicObject();
    auto trackId = juce::Uuid().toString();
    p->setProperty("trackId",   trackId);
    p->setProperty("name",      name);
    p->setProperty("ownerName", appState.getCurrentUser().displayName);
    p->setProperty("fileId",    fileId);
    p->setProperty("fileName",  fileName);
    p->setProperty("bpm",       bpm);
    p->setProperty("key",       key);

    juce::String typeStr;
    switch (type)
    {
        case SessionTrack::TrackType::MIDI:        typeStr = "midi"; break;
        case SessionTrack::TrackType::DrumPattern:  typeStr = "drum"; break;
        case SessionTrack::TrackType::Loop:         typeStr = "loop"; break;
        default:                                    typeStr = "audio"; break;
    }
    p->setProperty("trackType", typeStr);

    broadcastAction(SessionState::Action::Type::AddTrack, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::AddTrack;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::removeTrack(const juce::String& trackId)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("trackId", trackId);
    broadcastAction(SessionState::Action::Type::RemoveTrack, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::RemoveTrack;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::muteTrack(const juce::String& trackId, bool muted)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("trackId", trackId);
    p->setProperty("muted", muted);
    broadcastAction(SessionState::Action::Type::MuteTrack, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::MuteTrack;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::soloTrack(const juce::String& trackId, bool soloed)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("trackId", trackId);
    p->setProperty("soloed", soloed);
    broadcastAction(SessionState::Action::Type::SoloTrack, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::SoloTrack;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::setTrackVolume(const juce::String& trackId, float volume)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("trackId", trackId);
    p->setProperty("volume", (double)volume);
    broadcastAction(SessionState::Action::Type::VolumeTrack, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::VolumeTrack;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::addSuggestion(const juce::String& description, double positionBeats)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("suggestionId", juce::Uuid().toString());
    p->setProperty("authorName",   appState.getCurrentUser().displayName);
    p->setProperty("description",  description);
    p->setProperty("positionBeats", positionBeats);
    broadcastAction(SessionState::Action::Type::AddSuggestion, juce::var(p));

    SessionState::Action action;
    action.type = SessionState::Action::Type::AddSuggestion;
    action.actorUserId = appState.getCurrentUser().userId;
    action.payload = juce::var(p);
    sessionState.applyAction(action);
}

void SessionManager::sendChatMessage(const juce::String& text)
{
    auto* p = new juce::DynamicObject();
    p->setProperty("userId",   appState.getCurrentUser().userId);
    p->setProperty("userName", appState.getCurrentUser().displayName);
    p->setProperty("text",     text);
    broadcastAction(SessionState::Action::Type::ChatMessage, juce::var(p));
}

//==============================================================================
bool SessionManager::isInSession() const { return sessionState.getSessionId().isNotEmpty(); }
bool SessionManager::isHost() const      { return hostFlag; }
juce::String SessionManager::getSessionCode() const { return sessionCode; }

//==============================================================================
void SessionManager::onSessionAction(const juce::var& actionData)
{
    // Received an action from another participant
    if (auto* obj = actionData.getDynamicObject())
    {
        SessionState::Action action;
        action.actorUserId = obj->getProperty("actorUserId").toString();
        action.payload     = obj->getProperty("payload");
        action.timestamp   = (int64_t)(double)obj->getProperty("timestamp");

        auto typeStr = obj->getProperty("type").toString();

        // Map string to enum
        static const std::map<juce::String, SessionState::Action::Type> typeMap = {
            {"SetTempo",           SessionState::Action::Type::SetTempo},
            {"SetKey",             SessionState::Action::Type::SetKey},
            {"SetTimeSignature",   SessionState::Action::Type::SetTimeSignature},
            {"Play",               SessionState::Action::Type::Play},
            {"Stop",               SessionState::Action::Type::Stop},
            {"Seek",               SessionState::Action::Type::Seek},
            {"AddTrack",           SessionState::Action::Type::AddTrack},
            {"RemoveTrack",        SessionState::Action::Type::RemoveTrack},
            {"UpdateTrack",        SessionState::Action::Type::UpdateTrack},
            {"MuteTrack",          SessionState::Action::Type::MuteTrack},
            {"SoloTrack",          SessionState::Action::Type::SoloTrack},
            {"VolumeTrack",        SessionState::Action::Type::VolumeTrack},
            {"AddCollaborator",    SessionState::Action::Type::AddCollaborator},
            {"RemoveCollaborator", SessionState::Action::Type::RemoveCollaborator},
            {"AddSuggestion",      SessionState::Action::Type::AddSuggestion},
            {"ChatMessage",        SessionState::Action::Type::ChatMessage},
        };

        auto it = typeMap.find(typeStr);
        if (it != typeMap.end())
        {
            action.type = it->second;

            // Don't apply our own echoed actions
            if (action.actorUserId != appState.getCurrentUser().userId)
            {
                if (action.type == SessionState::Action::Type::ChatMessage)
                {
                    listeners.call(&SessionManager::Listener::onChatMessage,
                                   action.payload["userId"].toString(),
                                   action.payload["userName"].toString(),
                                   action.payload["text"].toString());
                }
                else
                {
                    sessionState.applyAction(action);
                }
            }
        }
    }
}

void SessionManager::onSessionStateSync(const juce::var& fullState)
{
    sessionState.deserializeFullState(fullState);
}

void SessionManager::onChatMessageReceived(const juce::var&)
{
    // Handled via onSessionAction
}

void SessionManager::onConnectionStateChanged(bool connected)
{
    if (connected && isInSession())
    {
        // Re-join room after reconnect
        webSocket.joinRoom(sessionState.getSessionId());
    }
}

void SessionManager::onActionApplied(const SessionState::Action&)
{
    // Could trigger UI refresh here
}

//==============================================================================
void SessionManager::broadcastAction(SessionState::Action::Type type, const juce::var& payload)
{
    if (!isInSession()) return;

    // Map enum to string
    static const char* typeNames[] = {
        "SetTempo", "SetKey", "SetTimeSignature",
        "Play", "Stop", "Seek",
        "AddTrack", "RemoveTrack", "UpdateTrack",
        "MuteTrack", "SoloTrack", "VolumeTrack",
        "AddCollaborator", "RemoveCollaborator",
        "AddSuggestion", "AcceptSuggestion", "RejectSuggestion",
        "AddMidi", "ChatMessage"
    };

    int typeIdx = static_cast<int>(type);
    juce::String typeStr = (typeIdx >= 0 && typeIdx < 19) ? typeNames[typeIdx] : "Unknown";

    auto* msg = new juce::DynamicObject();
    msg->setProperty("type",        typeStr);
    msg->setProperty("actorUserId", appState.getCurrentUser().userId);
    msg->setProperty("payload",     payload);
    msg->setProperty("timestamp",   (int64_t)juce::Time::currentTimeMillis());

    webSocket.sendSessionAction(sessionState.getSessionId(), juce::var(msg));
}
