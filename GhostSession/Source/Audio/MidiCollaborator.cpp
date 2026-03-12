#include "MidiCollaborator.h"

MidiCollaborator::MidiCollaborator()
{
    for (auto& v : voices)
        v.active = false;
}

//==============================================================================
void MidiCollaborator::setMidiForTrack(const juce::String& trackId,
                                        const juce::MidiMessageSequence& midi)
{
    const juce::ScopedLock sl(lock);
    midiTracks[trackId] = midi;
}

const juce::MidiMessageSequence* MidiCollaborator::getMidiForTrack(
    const juce::String& trackId) const
{
    const juce::ScopedLock sl(lock);
    auto it = midiTracks.find(trackId);
    return it != midiTracks.end() ? &it->second : nullptr;
}

void MidiCollaborator::renderMidiToBuffer(const juce::String& trackId,
                                           juce::AudioBuffer<float>& buffer,
                                           double startBeat, double beatsPerSample,
                                           double sampleRate)
{
    const juce::ScopedLock sl(lock);
    auto it = midiTracks.find(trackId);
    if (it == midiTracks.end()) return;

    auto& midi = it->second;
    int numSamples = buffer.getNumSamples();

    for (int s = 0; s < numSamples; ++s)
    {
        double currentBeat = startBeat + (double)s * beatsPerSample;

        // Check for MIDI events at this beat position
        for (int e = 0; e < midi.getNumEvents(); ++e)
        {
            auto* event = midi.getEventPointer(e);
            double eventBeat = event->message.getTimeStamp();

            // Events are stored in beats
            if (std::abs(eventBeat - currentBeat) < beatsPerSample)
            {
                if (event->message.isNoteOn())
                    noteOn(event->message.getNoteNumber(),
                           event->message.getFloatVelocity());
                else if (event->message.isNoteOff())
                    noteOff(event->message.getNoteNumber());
            }
        }

        // Render active voices
        float sample = renderSample(sampleRate);
        for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
            buffer.addSample(ch, s, sample * 0.3f); // Low volume for preview
    }
}

//==============================================================================
bool MidiCollaborator::importMidiFile(const juce::String& trackId,
                                       const juce::File& midiFile)
{
    juce::FileInputStream stream(midiFile);
    if (!stream.openedOk()) return false;

    juce::MidiFile midi;
    if (!midi.readFrom(stream)) return false;

    if (midi.getNumTracks() > 0)
    {
        auto* track = midi.getTrack(0);
        if (track)
        {
            // Convert timestamps from ticks to beats
            juce::MidiMessageSequence converted;
            double ticksPerBeat = (double)midi.getTimeFormat();

            for (int i = 0; i < track->getNumEvents(); ++i)
            {
                auto msg = track->getEventPointer(i)->message;
                double beats = msg.getTimeStamp() / ticksPerBeat;
                msg.setTimeStamp(beats);
                converted.addEvent(msg);
            }

            const juce::ScopedLock sl(lock);
            midiTracks[trackId] = converted;
            return true;
        }
    }

    return false;
}

juce::File MidiCollaborator::exportMidiToTempFile(const juce::String& trackId)
{
    const juce::ScopedLock sl(lock);
    auto it = midiTracks.find(trackId);
    if (it == midiTracks.end()) return {};

    auto tempFile = juce::File::getSpecialLocation(juce::File::tempDirectory)
                        .getChildFile("GhostSession_" + trackId + ".mid");

    juce::MidiFile midiFile;
    midiFile.setTicksPerQuarterNote(960);

    // Convert beats back to ticks
    juce::MidiMessageSequence tickSeq;
    for (int i = 0; i < it->second.getNumEvents(); ++i)
    {
        auto msg = it->second.getEventPointer(i)->message;
        msg.setTimeStamp(msg.getTimeStamp() * 960.0);
        tickSeq.addEvent(msg);
    }

    midiFile.addTrack(tickSeq);

    juce::FileOutputStream stream(tempFile);
    if (stream.openedOk())
        midiFile.writeTo(stream);

    return tempFile;
}

//==============================================================================
juce::MemoryBlock MidiCollaborator::serializeMidi(const juce::String& trackId) const
{
    const juce::ScopedLock sl(lock);
    auto it = midiTracks.find(trackId);
    if (it == midiTracks.end()) return {};

    juce::MidiFile midiFile;
    midiFile.setTicksPerQuarterNote(960);

    juce::MidiMessageSequence tickSeq;
    for (int i = 0; i < it->second.getNumEvents(); ++i)
    {
        auto msg = it->second.getEventPointer(i)->message;
        msg.setTimeStamp(msg.getTimeStamp() * 960.0);
        tickSeq.addEvent(msg);
    }
    midiFile.addTrack(tickSeq);

    juce::MemoryOutputStream stream;
    midiFile.writeTo(stream);
    return stream.getMemoryBlock();
}

void MidiCollaborator::deserializeMidi(const juce::String& trackId,
                                        const juce::MemoryBlock& data)
{
    juce::MemoryInputStream stream(data, false);
    juce::MidiFile midi;
    if (!midi.readFrom(stream) || midi.getNumTracks() == 0) return;

    auto* track = midi.getTrack(0);
    if (!track) return;

    double ticksPerBeat = (double)midi.getTimeFormat();
    juce::MidiMessageSequence converted;

    for (int i = 0; i < track->getNumEvents(); ++i)
    {
        auto msg = track->getEventPointer(i)->message;
        msg.setTimeStamp(msg.getTimeStamp() / ticksPerBeat);
        converted.addEvent(msg);
    }

    const juce::ScopedLock sl(lock);
    midiTracks[trackId] = converted;
}

void MidiCollaborator::removeMidiTrack(const juce::String& trackId)
{
    const juce::ScopedLock sl(lock);
    midiTracks.erase(trackId);
}

//==============================================================================
// Simple sine synth
void MidiCollaborator::noteOn(int note, float velocity)
{
    for (auto& v : voices)
    {
        if (!v.active)
        {
            v.noteNumber = note;
            v.frequency = 440.0 * std::pow(2.0, (note - 69.0) / 12.0);
            v.velocity = velocity;
            v.active = true;
            v.phase = 0.0;
            return;
        }
    }
}

void MidiCollaborator::noteOff(int note)
{
    for (auto& v : voices)
        if (v.active && v.noteNumber == note)
            v.active = false;
}

float MidiCollaborator::renderSample(double sampleRate)
{
    float out = 0.0f;
    for (auto& v : voices)
    {
        if (v.active)
        {
            out += (float)std::sin(v.phase * juce::MathConstants<double>::twoPi) * v.velocity;
            v.phase += v.frequency / sampleRate;
            if (v.phase >= 1.0) v.phase -= 1.0;
        }
    }
    return out;
}
