#include "SessionState.h"

SessionState::SessionState() {}

//==============================================================================
// Getters
juce::String SessionState::getSessionId() const       { const juce::ScopedLock sl(lock); return sessionId; }
juce::String SessionState::getSessionName() const     { const juce::ScopedLock sl(lock); return sessionName; }
double       SessionState::getTempo() const            { const juce::ScopedLock sl(lock); return tempo; }
juce::String SessionState::getKey() const              { const juce::ScopedLock sl(lock); return keySignature; }
int          SessionState::getTimeSignatureNum() const { const juce::ScopedLock sl(lock); return timeSigNum; }
int          SessionState::getTimeSignatureDen() const { const juce::ScopedLock sl(lock); return timeSigDen; }
bool         SessionState::isPlaying() const           { const juce::ScopedLock sl(lock); return playing; }
double       SessionState::getPlayPositionBeats() const { const juce::ScopedLock sl(lock); return playPositionBeats; }
int          SessionState::getSequenceNumber() const   { const juce::ScopedLock sl(lock); return sequenceNumber; }

// Setters (internal — called by applyAction)
void SessionState::setSessionId(const juce::String& id)     { const juce::ScopedLock sl(lock); sessionId = id; }
void SessionState::setSessionName(const juce::String& name) { const juce::ScopedLock sl(lock); sessionName = name; listeners.call(&Listener::onSessionMetadataChanged); }
void SessionState::setTempo(double bpm)                      { const juce::ScopedLock sl(lock); tempo = bpm; listeners.call(&Listener::onSessionMetadataChanged); }
void SessionState::setKey(const juce::String& k)             { const juce::ScopedLock sl(lock); keySignature = k; listeners.call(&Listener::onSessionMetadataChanged); }
void SessionState::setTimeSignature(int n, int d)            { const juce::ScopedLock sl(lock); timeSigNum = n; timeSigDen = d; listeners.call(&Listener::onSessionMetadataChanged); }

void SessionState::setPlaying(bool p)
{
    const juce::ScopedLock sl(lock);
    playing = p;
    listeners.call(&Listener::onTransportChanged, playing, playPositionBeats);
}

void SessionState::setPlayPositionBeats(double beats)
{
    const juce::ScopedLock sl(lock);
    playPositionBeats = beats;
}

//==============================================================================
// Collaborators
std::vector<ProducerProfile> SessionState::getCollaborators() const
{
    const juce::ScopedLock sl(lock);
    return collaborators;
}

void SessionState::addCollaborator(const ProducerProfile& producer)
{
    {
        const juce::ScopedLock sl(lock);
        // Don't add duplicates
        for (auto& c : collaborators)
            if (c.userId == producer.userId) return;
        collaborators.push_back(producer);
    }
    listeners.call(&Listener::onCollaboratorJoined, producer);
}

void SessionState::removeCollaborator(const juce::String& userId)
{
    {
        const juce::ScopedLock sl(lock);
        collaborators.erase(
            std::remove_if(collaborators.begin(), collaborators.end(),
                           [&](const ProducerProfile& p) { return p.userId == userId; }),
            collaborators.end());
    }
    listeners.call(&Listener::onCollaboratorLeft, userId);
}

void SessionState::updateCollaborator(const ProducerProfile& producer)
{
    const juce::ScopedLock sl(lock);
    for (auto& c : collaborators)
    {
        if (c.userId == producer.userId)
        {
            c = producer;
            break;
        }
    }
}

ProducerProfile SessionState::getHost() const
{
    const juce::ScopedLock sl(lock);
    for (auto& c : collaborators)
        if (c.isHost) return c;
    return {};
}

//==============================================================================
// Tracks
std::vector<SessionTrack> SessionState::getTracks() const
{
    const juce::ScopedLock sl(lock);
    return tracks;
}

void SessionState::addTrack(const SessionTrack& track)
{
    {
        const juce::ScopedLock sl(lock);
        tracks.push_back(track);
    }
    listeners.call(&Listener::onTrackAdded, track);
}

void SessionState::removeTrack(const juce::String& trackId)
{
    {
        const juce::ScopedLock sl(lock);
        tracks.erase(
            std::remove_if(tracks.begin(), tracks.end(),
                           [&](const SessionTrack& t) { return t.trackId == trackId; }),
            tracks.end());
    }
    listeners.call(&Listener::onTrackRemoved, trackId);
}

void SessionState::updateTrack(const SessionTrack& track)
{
    {
        const juce::ScopedLock sl(lock);
        for (auto& t : tracks)
        {
            if (t.trackId == track.trackId)
            {
                t = track;
                break;
            }
        }
    }
    listeners.call(&Listener::onTrackUpdated, track);
}

SessionTrack* SessionState::getTrackById(const juce::String& trackId)
{
    const juce::ScopedLock sl(lock);
    for (auto& t : tracks)
        if (t.trackId == trackId) return &t;
    return nullptr;
}

void SessionState::setTrackMuted(const juce::String& trackId, bool muted)
{
    const juce::ScopedLock sl(lock);
    for (auto& t : tracks)
    {
        if (t.trackId == trackId)
        {
            t.isMuted = muted;
            listeners.call(&Listener::onTrackUpdated, t);
            break;
        }
    }
}

void SessionState::setTrackSoloed(const juce::String& trackId, bool soloed)
{
    const juce::ScopedLock sl(lock);
    for (auto& t : tracks)
    {
        if (t.trackId == trackId)
        {
            t.isSoloed = soloed;
            listeners.call(&Listener::onTrackUpdated, t);
            break;
        }
    }
}

void SessionState::setTrackVolume(const juce::String& trackId, float volume)
{
    const juce::ScopedLock sl(lock);
    for (auto& t : tracks)
    {
        if (t.trackId == trackId)
        {
            t.volume = juce::jlimit(0.0f, 1.0f, volume);
            listeners.call(&Listener::onTrackUpdated, t);
            break;
        }
    }
}

//==============================================================================
// Suggestions
std::vector<Suggestion> SessionState::getSuggestions() const
{
    const juce::ScopedLock sl(lock);
    return suggestions;
}

void SessionState::addSuggestion(const Suggestion& s)
{
    {
        const juce::ScopedLock sl(lock);
        suggestions.push_back(s);
    }
    listeners.call(&Listener::onSuggestionAdded, s);
}

void SessionState::acceptSuggestion(const juce::String& suggestionId)
{
    const juce::ScopedLock sl(lock);
    for (auto& s : suggestions)
        if (s.suggestionId == suggestionId) { s.accepted = true; break; }
}

void SessionState::rejectSuggestion(const juce::String& suggestionId)
{
    const juce::ScopedLock sl(lock);
    for (auto& s : suggestions)
        if (s.suggestionId == suggestionId) { s.rejected = true; break; }
}

//==============================================================================
// Action system — Google Docs-style operational transforms
void SessionState::applyAction(const Action& action)
{
    {
        const juce::ScopedLock sl(lock);
        sequenceNumber++;
    }

    switch (action.type)
    {
        case Action::Type::SetTempo:
            setTempo((double)action.payload["bpm"]);
            break;

        case Action::Type::SetKey:
            setKey(action.payload["key"].toString());
            break;

        case Action::Type::SetTimeSignature:
            setTimeSignature((int)action.payload["num"], (int)action.payload["den"]);
            break;

        case Action::Type::Play:
            setPlaying(true);
            break;

        case Action::Type::Stop:
            setPlaying(false);
            break;

        case Action::Type::Seek:
            setPlayPositionBeats((double)action.payload["beats"]);
            break;

        case Action::Type::AddTrack:
        {
            SessionTrack track;
            track.trackId    = action.payload["trackId"].toString();
            track.name       = action.payload["name"].toString();
            track.ownerId    = action.actorUserId;
            track.ownerName  = action.payload["ownerName"].toString();
            track.fileName   = action.payload["fileName"].toString();
            track.fileId     = action.payload["fileId"].toString();
            track.bpm        = (double)action.payload["bpm"];
            track.key        = action.payload["key"].toString();

            auto typeStr = action.payload["trackType"].toString();
            if (typeStr == "midi")        track.type = SessionTrack::TrackType::MIDI;
            else if (typeStr == "drum")   track.type = SessionTrack::TrackType::DrumPattern;
            else if (typeStr == "loop")   track.type = SessionTrack::TrackType::Loop;
            else                           track.type = SessionTrack::TrackType::Audio;

            addTrack(track);
            break;
        }

        case Action::Type::RemoveTrack:
            removeTrack(action.payload["trackId"].toString());
            break;

        case Action::Type::UpdateTrack:
        {
            auto trackId = action.payload["trackId"].toString();
            if (auto* t = getTrackById(trackId))
            {
                if (action.payload.hasProperty("name"))
                    t->name = action.payload["name"].toString();
                if (action.payload.hasProperty("volume"))
                    t->volume = (float)(double)action.payload["volume"];
                if (action.payload.hasProperty("pan"))
                    t->pan = (float)(double)action.payload["pan"];
                updateTrack(*t);
            }
            break;
        }

        case Action::Type::MuteTrack:
            setTrackMuted(action.payload["trackId"].toString(),
                          (bool)action.payload["muted"]);
            break;

        case Action::Type::SoloTrack:
            setTrackSoloed(action.payload["trackId"].toString(),
                           (bool)action.payload["soloed"]);
            break;

        case Action::Type::VolumeTrack:
            setTrackVolume(action.payload["trackId"].toString(),
                           (float)(double)action.payload["volume"]);
            break;

        case Action::Type::AddCollaborator:
            addCollaborator(ProducerProfile::fromVar(action.payload));
            break;

        case Action::Type::RemoveCollaborator:
            removeCollaborator(action.payload["userId"].toString());
            break;

        case Action::Type::AddSuggestion:
        {
            Suggestion s;
            s.suggestionId   = action.payload["suggestionId"].toString();
            s.authorId       = action.actorUserId;
            s.authorName     = action.payload["authorName"].toString();
            s.description    = action.payload["description"].toString();
            s.positionBeats  = (double)action.payload["positionBeats"];
            s.timestamp      = juce::Time::getCurrentTime();
            addSuggestion(s);
            break;
        }

        case Action::Type::AcceptSuggestion:
            acceptSuggestion(action.payload["suggestionId"].toString());
            break;

        case Action::Type::RejectSuggestion:
            rejectSuggestion(action.payload["suggestionId"].toString());
            break;

        default:
            break;
    }

    listeners.call(&Listener::onActionApplied, action);
}

void SessionState::reset()
{
    const juce::ScopedLock sl(lock);
    sessionId.clear();
    sessionName.clear();
    tempo = 120.0;
    keySignature = "C";
    timeSigNum = 4;
    timeSigDen = 4;
    playing = false;
    playPositionBeats = 0.0;
    collaborators.clear();
    tracks.clear();
    suggestions.clear();
    sequenceNumber = 0;
}

//==============================================================================
juce::var SessionState::serializeFullState() const
{
    const juce::ScopedLock sl(lock);

    auto* obj = new juce::DynamicObject();
    obj->setProperty("sessionId",   sessionId);
    obj->setProperty("sessionName", sessionName);
    obj->setProperty("tempo",       tempo);
    obj->setProperty("key",         keySignature);
    obj->setProperty("timeSigNum",  timeSigNum);
    obj->setProperty("timeSigDen",  timeSigDen);
    obj->setProperty("playing",     playing);
    obj->setProperty("position",    playPositionBeats);
    obj->setProperty("sequence",    sequenceNumber);

    juce::Array<juce::var> collabArr;
    for (auto& c : collaborators) collabArr.add(c.toVar());
    obj->setProperty("collaborators", collabArr);

    juce::Array<juce::var> trackArr;
    for (auto& t : tracks)
    {
        auto* to = new juce::DynamicObject();
        to->setProperty("trackId",   t.trackId);
        to->setProperty("name",      t.name);
        to->setProperty("ownerId",   t.ownerId);
        to->setProperty("ownerName", t.ownerName);
        to->setProperty("muted",     t.isMuted);
        to->setProperty("soloed",    t.isSoloed);
        to->setProperty("volume",    (double)t.volume);
        to->setProperty("pan",       (double)t.pan);
        to->setProperty("fileId",    t.fileId);
        to->setProperty("fileName",  t.fileName);
        to->setProperty("bpm",       t.bpm);
        to->setProperty("key",       t.key);
        trackArr.add(juce::var(to));
    }
    obj->setProperty("tracks", trackArr);

    return juce::var(obj);
}

void SessionState::deserializeFullState(const juce::var& state)
{
    const juce::ScopedLock sl(lock);

    if (auto* obj = state.getDynamicObject())
    {
        sessionId       = obj->getProperty("sessionId").toString();
        sessionName     = obj->getProperty("sessionName").toString();
        tempo           = (double)obj->getProperty("tempo");
        keySignature    = obj->getProperty("key").toString();
        timeSigNum      = (int)obj->getProperty("timeSigNum");
        timeSigDen      = (int)obj->getProperty("timeSigDen");
        playing         = (bool)obj->getProperty("playing");
        playPositionBeats = (double)obj->getProperty("position");
        sequenceNumber  = (int)obj->getProperty("sequence");

        collaborators.clear();
        if (auto* arr = obj->getProperty("collaborators").getArray())
            for (auto& item : *arr)
                collaborators.push_back(ProducerProfile::fromVar(item));

        tracks.clear();
        if (auto* arr = obj->getProperty("tracks").getArray())
        {
            for (auto& item : *arr)
            {
                if (auto* to = item.getDynamicObject())
                {
                    SessionTrack t;
                    t.trackId   = to->getProperty("trackId").toString();
                    t.name      = to->getProperty("name").toString();
                    t.ownerId   = to->getProperty("ownerId").toString();
                    t.ownerName = to->getProperty("ownerName").toString();
                    t.isMuted   = (bool)to->getProperty("muted");
                    t.isSoloed  = (bool)to->getProperty("soloed");
                    t.volume    = (float)(double)to->getProperty("volume");
                    t.pan       = (float)(double)to->getProperty("pan");
                    t.fileId    = to->getProperty("fileId").toString();
                    t.fileName  = to->getProperty("fileName").toString();
                    t.bpm       = (double)to->getProperty("bpm");
                    t.key       = to->getProperty("key").toString();
                    tracks.push_back(t);
                }
            }
        }
    }
}

void SessionState::addListener(Listener* l)   { listeners.add(l); }
void SessionState::removeListener(Listener* l) { listeners.remove(l); }
