#pragma once

#include "JuceHeader.h"
#include "SessionState.h"
#include "../Core/AppState.h"
#include "../Network/WebSocketConnection.h"
#include "../Network/ApiClient.h"

//==============================================================================
/**
 * SessionManager — The brain of Ghost Session.
 *
 * Manages the lifecycle of a collaborative session:
 *   - Host creates a session → gets a session code
 *   - Other producers join with the code
 *   - All actions are broadcast to all participants via WebSocket
 *   - New joiners receive the full session state snapshot
 *
 * This is the "Google Docs engine" — it keeps everyone in sync
 * using an action-based system where every change is:
 *   1. Applied locally (optimistic UI)
 *   2. Sent to the server
 *   3. Broadcast to all other participants
 *   4. Conflicts resolved by server ordering
 */
class SessionManager : public WebSocketConnection::Listener,
                       public SessionState::Listener
{
public:
    SessionManager(AppState& appState,
                   WebSocketConnection& ws,
                   ApiClient& api);
    ~SessionManager() override;

    //==============================================================================
    // Session lifecycle

    /** Create a new session. This user becomes the host. */
    void createSession(const juce::String& sessionName,
                       double tempo, const juce::String& key,
                       std::function<void(bool success, const juce::String& sessionCode)> callback);

    /** Join an existing session by code. */
    void joinSession(const juce::String& sessionCode,
                     std::function<void(bool success, const juce::String& error)> callback);

    /** Leave the current session. If host, session ends for everyone. */
    void leaveSession();

    /** End the session (host only). */
    void endSession();

    /** Invite a producer by username/email. */
    void inviteProducer(const juce::String& usernameOrEmail);

    //==============================================================================
    // Session actions (these get broadcast to all participants)

    void setTempo(double bpm);
    void setKey(const juce::String& key);
    void setTimeSignature(int num, int den);
    void play();
    void stop();
    void seek(double positionBeats);

    void addTrack(const juce::String& name, SessionTrack::TrackType type,
                  const juce::String& fileId = {}, const juce::String& fileName = {},
                  double bpm = 0, const juce::String& key = {});
    void removeTrack(const juce::String& trackId);
    void muteTrack(const juce::String& trackId, bool muted);
    void soloTrack(const juce::String& trackId, bool soloed);
    void setTrackVolume(const juce::String& trackId, float volume);

    void addSuggestion(const juce::String& description, double positionBeats);

    void sendChatMessage(const juce::String& text);

    //==============================================================================
    // Session state access
    SessionState& getSessionState() { return sessionState; }
    const SessionState& getSessionState() const { return sessionState; }
    bool isInSession() const;
    bool isHost() const;
    juce::String getSessionCode() const;

    //==============================================================================
    // WebSocketConnection::Listener
    void onSessionAction(const juce::var& actionData) override;
    void onSessionStateSync(const juce::var& fullState) override;
    void onChatMessageReceived(const juce::var& messageData) override;
    void onConnectionStateChanged(bool connected) override;

    // SessionState::Listener
    void onActionApplied(const SessionState::Action& action) override;

    //==============================================================================
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void onSessionCreated(const juce::String& sessionCode) {}
        virtual void onSessionJoined() {}
        virtual void onSessionEnded() {}
        virtual void onSessionError(const juce::String& error) {}
        virtual void onChatMessage(const juce::String& userId,
                                   const juce::String& userName,
                                   const juce::String& text) {}
    };

    void addListener(Listener* l)    { listeners.add(l); }
    void removeListener(Listener* l) { listeners.remove(l); }

private:
    AppState& appState;
    WebSocketConnection& webSocket;
    ApiClient& apiClient;
    SessionState sessionState;

    juce::String sessionCode;
    bool hostFlag = false;

    juce::ListenerList<Listener> listeners;

    void broadcastAction(SessionState::Action::Type type, const juce::var& payload);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SessionManager)
};
