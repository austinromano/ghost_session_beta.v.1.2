#include "SharedTransport.h"

SharedTransport::SharedTransport(SessionState& session)
    : sessionState(session)
{
    sessionState.addListener(this);
    tempo.store(session.getTempo());
    startTimerHz(10); // 10 Hz sync tick
}

SharedTransport::~SharedTransport()
{
    stopTimer();
    sessionState.removeListener(this);
}

//==============================================================================
double SharedTransport::getBeatsPerSample() const
{
    return tempo.load() / (60.0 * sampleRate);
}

double SharedTransport::getSamplesPerBeat() const
{
    return (60.0 * sampleRate) / tempo.load();
}

void SharedTransport::advance()
{
    if (playing.load())
    {
        double beat = currentBeat.load();
        beat += getBeatsPerSample();
        currentBeat.store(beat);

        // Also update session state (non-audio-thread safe version)
        // The actual session state is updated periodically in timerCallback
    }
}

double SharedTransport::getPositionForSample(int sampleIndex) const
{
    return currentBeat.load() + (double)sampleIndex * getBeatsPerSample();
}

//==============================================================================
void SharedTransport::syncToPosition(double beatPosition, int64_t serverTimestampMs)
{
    // Compensate for network latency
    // The server sent this position at serverTimestampMs
    // Current time minus server time = transit delay
    // We need to add the beats that elapsed during transit

    double transitMs = (double)(juce::Time::currentTimeMillis() - serverTimestampMs);
    transitMs = juce::jmax(0.0, transitMs); // Don't go negative

    double transitBeats = (tempo.load() / 60000.0) * transitMs;
    double compensatedPosition = beatPosition + transitBeats;

    // Only snap if the difference is significant (> 1/16 note = 0.25 beats)
    double diff = std::abs(currentBeat.load() - compensatedPosition);
    if (diff > 0.25)
        currentBeat.store(compensatedPosition);
}

//==============================================================================
void SharedTransport::onTransportChanged(bool isPlaying, double positionBeats)
{
    playing.store(isPlaying);
    if (!isPlaying || positionBeats >= 0)
        currentBeat.store(positionBeats);
}

void SharedTransport::onSessionMetadataChanged()
{
    tempo.store(sessionState.getTempo());
}

void SharedTransport::timerCallback()
{
    // Update session state with our current position (for UI display)
    if (playing.load())
        sessionState.setPlayPositionBeats(currentBeat.load());
}
