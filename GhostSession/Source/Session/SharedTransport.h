#pragma once

#include "JuceHeader.h"
#include "SessionState.h"

//==============================================================================
/**
 * SharedTransport — Keeps all collaborators' playback in sync.
 *
 * When the host (or any producer) hits Play:
 *   1. A "Play" action is broadcast with the current beat position
 *   2. All clients receive the action and start their local transport
 *   3. Periodic sync messages keep everyone aligned (beat clock)
 *
 * This handles:
 *   - Latency compensation (clients account for network delay)
 *   - Beat quantization (actions snap to beat grid)
 *   - Tempo changes (smoothly retimed across all clients)
 */
class SharedTransport : public juce::Timer,
                        public SessionState::Listener
{
public:
    explicit SharedTransport(SessionState& session);
    ~SharedTransport() override;

    //==============================================================================
    // Local transport state (what the audio engine reads)
    bool   isPlaying() const { return playing.load(); }
    double getCurrentBeat() const { return currentBeat.load(); }
    double getTempo() const { return tempo.load(); }
    double getBeatsPerSample() const;
    double getSamplesPerBeat() const;

    void setSampleRate(double sr) { sampleRate = sr; }

    //==============================================================================
    // Called from audio thread — advance position by one sample
    void advance();

    // Called from audio thread — get current position for this buffer
    double getPositionForSample(int sampleIndex) const;

    //==============================================================================
    // Network sync — called when receiving a sync message from server
    void syncToPosition(double beatPosition, int64_t serverTimestampMs);

    //==============================================================================
    // SessionState::Listener
    void onTransportChanged(bool isPlaying, double positionBeats) override;
    void onSessionMetadataChanged() override;

    // Timer for periodic sync broadcast
    void timerCallback() override;

    //==============================================================================
    // Latency measurement
    void setNetworkLatencyMs(double latencyMs) { networkLatencyMs = latencyMs; }
    double getNetworkLatencyMs() const { return networkLatencyMs; }

private:
    SessionState& sessionState;

    std::atomic<bool>   playing { false };
    std::atomic<double> currentBeat { 0.0 };
    std::atomic<double> tempo { 120.0 };
    double sampleRate = 44100.0;
    double networkLatencyMs = 0.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SharedTransport)
};
