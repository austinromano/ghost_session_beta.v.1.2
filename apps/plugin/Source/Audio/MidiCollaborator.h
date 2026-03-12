#pragma once

#include "JuceHeader.h"
#include "../Session/SessionState.h"

//==============================================================================
/**
 * MidiCollaborator — Handles collaborative MIDI editing.
 *
 * When a producer adds MIDI to the session:
 *   1. MIDI data is captured from their DAW
 *   2. Sent to all participants as a MIDI clip
 *   3. Other producers can hear it played back via a basic synth
 *   4. MIDI can be dragged out of the plugin into their own DAW
 *
 * Each MIDI track is stored as a juce::MidiMessageSequence in the session.
 */
class MidiCollaborator
{
public:
    MidiCollaborator();
    ~MidiCollaborator() = default;

    //==============================================================================
    // Store MIDI for a track
    void setMidiForTrack(const juce::String& trackId,
                         const juce::MidiMessageSequence& midi);

    // Get MIDI for playback
    const juce::MidiMessageSequence* getMidiForTrack(const juce::String& trackId) const;

    // Render MIDI to audio buffer using simple sine synth (for preview)
    void renderMidiToBuffer(const juce::String& trackId,
                            juce::AudioBuffer<float>& buffer,
                            double startBeat, double beatsPerSample,
                            double sampleRate);

    //==============================================================================
    // Import MIDI from file
    bool importMidiFile(const juce::String& trackId, const juce::File& midiFile);

    // Export MIDI to file (for drag-to-DAW)
    juce::File exportMidiToTempFile(const juce::String& trackId);

    //==============================================================================
    // Serialize MIDI data for network transmission
    juce::MemoryBlock serializeMidi(const juce::String& trackId) const;
    void deserializeMidi(const juce::String& trackId, const juce::MemoryBlock& data);

    void removeMidiTrack(const juce::String& trackId);

private:
    std::map<juce::String, juce::MidiMessageSequence> midiTracks;
    mutable juce::CriticalSection lock;

    // Simple sine synth for MIDI preview
    struct Voice
    {
        int noteNumber = -1;
        double phase = 0.0;
        double frequency = 0.0;
        float velocity = 0.0f;
        bool active = false;
    };

    static constexpr int kMaxVoices = 16;
    Voice voices[kMaxVoices];

    void noteOn(int note, float velocity);
    void noteOff(int note);
    float renderSample(double sampleRate);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiCollaborator)
};
