#include "AudioEngine.h"

AudioEngine::AudioEngine(SessionState& session, SharedTransport& trans)
    : sessionState(session), transport(trans)
{
    formatManager.registerBasicFormats();
    sessionState.addListener(this);
}

AudioEngine::~AudioEngine()
{
    sessionState.removeListener(this);
}

void AudioEngine::prepare(double sr, int bs, int ch)
{
    currentSampleRate = sr;
    currentBlockSize = bs;
    currentChannels = ch;
    tempBuffer.setSize(ch, bs);
    transport.setSampleRate(sr);
}

void AudioEngine::releaseResources()
{
    const juce::ScopedLock sl(trackLock);
    loadedTracks.clear();
    tempBuffer.setSize(0, 0);
}

//==============================================================================
void AudioEngine::renderBlock(juce::AudioBuffer<float>& buffer, int numSamples)
{
    if (!transport.isPlaying())
        return;

    const juce::ScopedLock sl(trackLock);

    bool hasSolo = anySoloed();

    for (auto& [id, track] : loadedTracks)
    {
        if (!track || !track->source)
            continue;

        // Skip muted tracks; if any track is soloed, skip non-soloed tracks
        if (track->muted) continue;
        if (hasSolo && !track->soloed) continue;

        // Calculate read position based on shared transport
        double currentBeat = transport.getCurrentBeat();
        double beatsPerSecond = transport.getTempo() / 60.0;
        double positionSeconds = currentBeat / beatsPerSecond;
        int64_t positionSamples = (int64_t)(positionSeconds * track->fileSampleRate);

        // Loop the track
        if (track->lengthInSamples > 0)
            positionSamples = positionSamples % track->lengthInSamples;

        // Seek the source
        track->source->setNextReadPosition(positionSamples);

        // Read into temp buffer
        tempBuffer.setSize(currentChannels, numSamples, false, false, true);
        tempBuffer.clear();

        juce::AudioSourceChannelInfo info(&tempBuffer, 0, numSamples);
        track->source->getNextAudioBlock(info);

        // Apply volume and pan, mix into output
        float vol = track->volume;
        float panL = juce::jmin(1.0f, 1.0f - track->pan);
        float panR = juce::jmin(1.0f, 1.0f + track->pan);

        if (buffer.getNumChannels() >= 2)
        {
            buffer.addFrom(0, 0, tempBuffer, 0, 0, numSamples, vol * panL);
            if (tempBuffer.getNumChannels() >= 2)
                buffer.addFrom(1, 0, tempBuffer, 1, 0, numSamples, vol * panR);
            else
                buffer.addFrom(1, 0, tempBuffer, 0, 0, numSamples, vol * panR);
        }
        else
        {
            buffer.addFrom(0, 0, tempBuffer, 0, 0, numSamples, vol);
        }
    }

    // Advance transport for each sample processed
    for (int i = 0; i < numSamples; ++i)
        transport.advance();
}

//==============================================================================
void AudioEngine::loadTrackAudio(const juce::String& trackId, const juce::File& audioFile)
{
    auto* reader = formatManager.createReaderFor(audioFile);
    if (!reader) return;

    auto loaded = std::make_unique<LoadedTrack>();
    loaded->trackId = trackId;
    loaded->reader.reset(reader);
    loaded->source = std::make_unique<juce::AudioFormatReaderSource>(reader, false);
    loaded->lengthInSamples = reader->lengthInSamples;
    loaded->fileSampleRate = reader->sampleRate;

    // Copy track settings from session state
    auto tracks = sessionState.getTracks();
    for (auto& t : tracks)
    {
        if (t.trackId == trackId)
        {
            loaded->volume = t.volume;
            loaded->muted = t.isMuted;
            loaded->soloed = t.isSoloed;
            loaded->pan = t.pan;
            break;
        }
    }

    const juce::ScopedLock sl(trackLock);
    loadedTracks[trackId] = std::move(loaded);
}

void AudioEngine::unloadTrackAudio(const juce::String& trackId)
{
    const juce::ScopedLock sl(trackLock);
    loadedTracks.erase(trackId);
}

//==============================================================================
void AudioEngine::onTrackAdded(const SessionTrack& track)
{
    // Audio data will be loaded separately via loadTrackAudio()
}

void AudioEngine::onTrackRemoved(const juce::String& trackId)
{
    unloadTrackAudio(trackId);
}

void AudioEngine::onTrackUpdated(const SessionTrack& track)
{
    const juce::ScopedLock sl(trackLock);
    auto it = loadedTracks.find(track.trackId);
    if (it != loadedTracks.end() && it->second)
    {
        it->second->volume = track.volume;
        it->second->muted = track.isMuted;
        it->second->soloed = track.isSoloed;
        it->second->pan = track.pan;
    }
}

bool AudioEngine::anySoloed() const
{
    for (auto& [id, track] : loadedTracks)
        if (track && track->soloed) return true;
    return false;
}
