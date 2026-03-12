#pragma once

#include "JuceHeader.h"
#include "WaveformDisplay.h"
#include "GhostTheme.h"

class GhostSessionProcessor;

//==============================================================================
/**
 * Bottom bar — Shared transport controls.
 *
 * Everyone in the session sees the same transport state.
 * When anyone hits play, everyone's session starts playing.
 */
class TransportBar : public juce::Component,
                     public juce::Timer
{
public:
    explicit TransportBar(GhostSessionProcessor& processor);
    ~TransportBar() override;

    void paint(juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;
    void parentHierarchyChanged() override;

private:
    GhostSessionProcessor& proc;

    juce::TextButton playButton  { "Play" };
    juce::TextButton stopButton  { "Stop" };
    juce::Slider     tempoSlider;
    juce::Slider     volumeSlider;
    juce::Label      positionLabel;
    juce::Label      tempoDisplay;
    juce::Label      keyDisplay;
    juce::Label      timeSigDisplay;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TransportBar)
};
