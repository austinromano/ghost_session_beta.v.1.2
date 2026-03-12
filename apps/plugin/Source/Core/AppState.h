#pragma once

#include "JuceHeader.h"

//==============================================================================
// Data structures for the collaborative session model
//==============================================================================

struct ProducerProfile
{
    juce::String    userId;
    juce::String    displayName;
    juce::String    avatarUrl;
    juce::Colour    colour;         // Unique colour per collaborator in session
    bool            isOnline = false;
    bool            isHost   = false;

    juce::var toVar() const
    {
        auto* obj = new juce::DynamicObject();
        obj->setProperty("userId",      userId);
        obj->setProperty("displayName", displayName);
        obj->setProperty("avatarUrl",   avatarUrl);
        obj->setProperty("colour",      (juce::int64)colour.getARGB());
        obj->setProperty("isOnline",    isOnline);
        obj->setProperty("isHost",      isHost);
        return juce::var(obj);
    }

    static ProducerProfile fromVar(const juce::var& v)
    {
        ProducerProfile p;
        if (auto* obj = v.getDynamicObject())
        {
            p.userId      = obj->getProperty("userId").toString();
            p.displayName = obj->getProperty("displayName").toString();
            p.avatarUrl   = obj->getProperty("avatarUrl").toString();
            p.colour      = juce::Colour(static_cast<juce::uint32>(static_cast<juce::int64>(obj->getProperty("colour"))));
            p.isOnline    = (bool)obj->getProperty("isOnline");
            p.isHost      = (bool)obj->getProperty("isHost");
        }
        return p;
    }
};

//==============================================================================
/**
 * A single track in the shared session.
 */
struct SessionTrack
{
    juce::String    trackId;
    juce::String    name;           // e.g. "Drums", "Bass", "Keys"
    juce::String    ownerId;        // Producer who owns/created this track
    juce::String    ownerName;
    juce::Colour    ownerColour;
    bool            isMuted  = false;
    bool            isSoloed = false;
    float           volume   = 0.8f;
    float           pan      = 0.0f;

    enum class TrackType { Audio, MIDI, DrumPattern, Loop };
    TrackType       type = TrackType::Audio;

    // For audio tracks: the file data
    juce::String    fileId;
    juce::String    fileName;
    double          bpm = 0.0;
    juce::String    key;

    // Waveform peak data for display
    std::vector<float> peaks;
};

//==============================================================================
/**
 * A suggestion from a collaborator (chord change, arrangement idea, etc.)
 */
struct Suggestion
{
    juce::String    suggestionId;
    juce::String    authorId;
    juce::String    authorName;
    juce::String    description;    // e.g. "Try Fm7 here instead"
    double          positionBeats;  // Position in the timeline
    juce::Time      timestamp;
    bool            accepted = false;
    bool            rejected = false;
};

//==============================================================================
/**
 * Central application state. Thread-safe.
 */
class AppState
{
public:
    AppState();
    ~AppState() = default;

    // Auth
    void setAuthToken(const juce::String& token);
    juce::String getAuthToken() const;
    bool isLoggedIn() const;
    void setCurrentUser(const ProducerProfile& profile);
    ProducerProfile getCurrentUser() const;

    // Session info
    void setSessionId(const juce::String& id);
    juce::String getSessionId() const;
    bool isInSession() const;

    // Preferences
    void setDownloadDirectory(const juce::File& dir);
    juce::File getDownloadDirectory() const;
    void setServerUrl(const juce::String& url);
    juce::String getServerUrl() const;
    void setListenVolume(float v);
    float getListenVolume() const;

    // Serialization
    juce::ValueTree serialize() const;
    void deserialize(const juce::ValueTree& tree);

    // Listener
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void appStateChanged() {}
        virtual void authStateChanged() {}
    };
    void addListener(Listener* l);
    void removeListener(Listener* l);

private:
    mutable juce::CriticalSection lock;

    juce::String authToken;
    ProducerProfile currentUser;
    juce::String sessionId;
    juce::File downloadDirectory;
    juce::String serverUrl = "ws://localhost:3000";
    float listenVolume = 0.8f;

    juce::ListenerList<Listener> listeners;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AppState)
};
