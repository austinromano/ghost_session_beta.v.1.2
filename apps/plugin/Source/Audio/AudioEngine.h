#pragma once

#include "JuceHeader.h"
#include "../Session/SessionState.h"
#include "../Session/SharedTransport.h"

//==============================================================================
/**
 * AudioEngine — Plays back the shared session tracks.
 *
 * Each SessionTrack is loaded as an audio source. The engine:
 *   1. Reads the SharedTransport for current position
 *   2. Renders each track's audio at the correct position
 *   3. Applies per-track volume, mute, solo
 *   4. Mixes everything into the output buffer
 *
 * Tracks loop automatically based on their length and the session tempo.
 */
class AudioEngine : public SessionState::Listener
{
public:
    AudioEngine(SessionState& session, SharedTransport& transport);
    ~AudioEngine() override;

    void prepare(double sampleRate, int blockSize, int channels);
    void releaseResources();

    // Called from processBlock — renders all session tracks
    void renderBlock(juce::AudioBuffer<float>& buffer, int numSamples);

    // Load audio data for a track
    void loadTrackAudio(const juce::String& trackId, const juce::File& audioFile);
    void unloadTrackAudio(const juce::String& trackId);

    // SessionState::Listener
    void onTrackAdded(const SessionTrack& track) override;
    void onTrackRemoved(const juce::String& trackId) override;
    void onTrackUpdated(const SessionTrack& track) override;

private:
    SessionState& sessionState;
    SharedTransport& transport;

    struct LoadedTrack
    {
        juce::String trackId;
        std::unique_ptr<juce::AudioFormatReaderSource> source;
        std::unique_ptr<juce::AudioFormatReader> reader;
        float volume = 0.8f;
        float pan = 0.0f;
        bool muted = false;
        bool soloed = false;
        int64_t lengthInSamples = 0;
        double fileSampleRate = 44100.0;
    };

    std::map<juce::String, std::unique_ptr<LoadedTrack>> loadedTracks;
    juce::CriticalSection trackLock;

    juce::AudioFormatManager formatManager;
    juce::AudioBuffer<float> tempBuffer;

    double currentSampleRate = 44100.0;
    int currentBlockSize = 512;
    int currentChannels = 2;

    bool anySoloed() const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioEngine)
};
