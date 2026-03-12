#pragma once

#include "JuceHeader.h"
#include "../Core/AppState.h"

//==============================================================================
/**
 * SessionState — The shared collaborative state of a live Ghost Session.
 *
 * This is the "document" that all collaborators see and edit, similar
 * to how Google Docs has a shared document state.
 *
 * Contains:
 *   - Session metadata (tempo, key, time signature)
 *   - List of collaborators
 *   - Shared track list
 *   - Transport position (synced)
 *   - Suggestions/comments
 *   - Version history (every action is versioned for undo)
 *
 * Thread-safe. All mutations go through applyAction() which broadcasts
 * changes to listeners and to the network (via SessionManager).
 */
class SessionState
{
public:
    SessionState();
    ~SessionState() = default;

    //==============================================================================
    // Session metadata
    juce::String getSessionId() const;
    juce::String getSessionName() const;
    double       getTempo() const;
    juce::String getKey() const;
    int          getTimeSignatureNum() const;
    int          getTimeSignatureDen() const;
    bool         isPlaying() const;
    double       getPlayPositionBeats() const;

    void setSessionId(const juce::String& id);
    void setSessionName(const juce::String& name);
    void setTempo(double bpm);
    void setKey(const juce::String& key);
    void setTimeSignature(int num, int den);
    void setPlaying(bool playing);
    void setPlayPositionBeats(double beats);

    //==============================================================================
    // Collaborators
    std::vector<ProducerProfile> getCollaborators() const;
    void addCollaborator(const ProducerProfile& producer);
    void removeCollaborator(const juce::String& userId);
    void updateCollaborator(const ProducerProfile& producer);
    ProducerProfile getHost() const;

    //==============================================================================
    // Tracks
    std::vector<SessionTrack> getTracks() const;
    void addTrack(const SessionTrack& track);
    void removeTrack(const juce::String& trackId);
    void updateTrack(const SessionTrack& track);
    SessionTrack* getTrackById(const juce::String& trackId);
    void setTrackMuted(const juce::String& trackId, bool muted);
    void setTrackSoloed(const juce::String& trackId, bool soloed);
    void setTrackVolume(const juce::String& trackId, float volume);

    //==============================================================================
    // Suggestions
    std::vector<Suggestion> getSuggestions() const;
    void addSuggestion(const Suggestion& s);
    void acceptSuggestion(const juce::String& suggestionId);
    void rejectSuggestion(const juce::String& suggestionId);

    //==============================================================================
    // Actions — all state changes go through here for sync
    struct Action
    {
        enum class Type
        {
            SetTempo, SetKey, SetTimeSignature,
            Play, Stop, Seek,
            AddTrack, RemoveTrack, UpdateTrack,
            MuteTrack, SoloTrack, VolumeTrack,
            AddCollaborator, RemoveCollaborator,
            AddSuggestion, AcceptSuggestion, RejectSuggestion,
            AddMidi, ChatMessage
        };

        Type type;
        juce::String actorUserId;   // Who performed this action
        juce::var payload;
        int64_t timestamp = 0;
        int sequenceNumber = 0;
    };

    void applyAction(const Action& action);
    int getSequenceNumber() const;

    // Reset to initial state
    void reset();

    // Serialize full state for new joiners
    juce::var serializeFullState() const;
    void deserializeFullState(const juce::var& state);

    //==============================================================================
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void onSessionMetadataChanged() {}
        virtual void onCollaboratorJoined(const ProducerProfile& producer) {}
        virtual void onCollaboratorLeft(const juce::String& userId) {}
        virtual void onTrackAdded(const SessionTrack& track) {}
        virtual void onTrackRemoved(const juce::String& trackId) {}
        virtual void onTrackUpdated(const SessionTrack& track) {}
        virtual void onTransportChanged(bool playing, double positionBeats) {}
        virtual void onSuggestionAdded(const Suggestion& suggestion) {}
        virtual void onActionApplied(const Action& action) {}
    };

    void addListener(Listener* l);
    void removeListener(Listener* l);

private:
    mutable juce::CriticalSection lock;

    juce::String sessionId;
    juce::String sessionName;
    double tempo = 120.0;
    juce::String keySignature = "C";
    int timeSigNum = 4;
    int timeSigDen = 4;
    bool playing = false;
    double playPositionBeats = 0.0;

    std::vector<ProducerProfile> collaborators;
    std::vector<SessionTrack> tracks;
    std::vector<Suggestion> suggestions;

    int sequenceNumber = 0;

    juce::ListenerList<Listener> listeners;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SessionState)
};
