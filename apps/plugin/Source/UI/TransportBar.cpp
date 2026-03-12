#include "TransportBar.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"

TransportBar::TransportBar(GhostSessionProcessor& processor)
    : proc(processor)
{
    playButton.onClick = [this] { proc.getSessionManager().play(); };
    addAndMakeVisible(playButton);

    stopButton.onClick = [this] { proc.getSessionManager().stop(); };
    addAndMakeVisible(stopButton);

    tempoSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    tempoSlider.setRange(30.0, 300.0, 0.5);
    tempoSlider.setValue(140.0);
    tempoSlider.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);
    tempoSlider.onValueChange = [this] {
        proc.getSessionManager().setTempo(tempoSlider.getValue());
    };
    addAndMakeVisible(tempoSlider);

    volumeSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    volumeSlider.setRange(0.0, 1.0, 0.01);
    volumeSlider.setValue(0.8);
    volumeSlider.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);
    volumeSlider.onValueChange = [this] {
        proc.getAppState().setListenVolume((float)volumeSlider.getValue());
    };
    addAndMakeVisible(volumeSlider);

    // Labels
    auto setupLabel = [](juce::Label& l, float size) {
        l.setFont(juce::Font(juce::Font::getDefaultMonospacedFontName(), size, juce::Font::bold));
        l.setColour(juce::Label::textColourId, GhostColours::textSecondary);
        l.setJustificationType(juce::Justification::centred);
    };

    setupLabel(positionLabel, 14.0f);
    setupLabel(tempoDisplay, 13.0f);
    setupLabel(keyDisplay, 13.0f);
    setupLabel(timeSigDisplay, 12.0f);

    addAndMakeVisible(positionLabel);
    addAndMakeVisible(tempoDisplay);
    addAndMakeVisible(keyDisplay);
    addAndMakeVisible(timeSigDisplay);

    // Timer started in parentHierarchyChanged when attached to a window
}

TransportBar::~TransportBar() { stopTimer(); }

void TransportBar::parentHierarchyChanged()
{
    if (isShowing() && !isTimerRunning())
        startTimerHz(30);
    else if (!isShowing() && isTimerRunning())
        stopTimer();
}

void TransportBar::paint(juce::Graphics& g)
{
    GhostLog::write("[TransportBar] paint start");
    g.setColour(GhostColours::surface.darker(0.1f));
    g.fillRect(getLocalBounds());

    // Top border
    g.setColour(GhostColours::border);
    g.drawLine(0, 0.5f, (float)getWidth(), 0.5f, 1.0f);

    // Playing indicator dot
    auto& ss = proc.getSessionManager().getSessionState();
    if (ss.isPlaying())
    {
        g.setColour(GhostColours::ghostGreen);
        g.fillEllipse(8.0f, (float)getHeight() / 2.0f - 4.0f, 8.0f, 8.0f);
    }
    GhostLog::write("[TransportBar] paint done");
}

void TransportBar::resized()
{
    auto bounds = getLocalBounds().reduced(20, 8);

    // Left: transport buttons
    playButton.setBounds(bounds.removeFromLeft(60).reduced(2));
    stopButton.setBounds(bounds.removeFromLeft(48).reduced(2));
    bounds.removeFromLeft(12);

    // Position display
    positionLabel.setBounds(bounds.removeFromLeft(80));
    bounds.removeFromLeft(8);

    // Right: volume
    volumeSlider.setBounds(bounds.removeFromRight(100).reduced(2, 10));
    bounds.removeFromRight(8);

    // Tempo + Key + Time sig
    keyDisplay.setBounds(bounds.removeFromRight(50));
    timeSigDisplay.setBounds(bounds.removeFromRight(40));
    tempoDisplay.setBounds(bounds.removeFromRight(70));

    // Tempo slider
    tempoSlider.setBounds(bounds.reduced(2, 10));
}

void TransportBar::timerCallback()
{
    if (!isShowing()) return;

    try
    {
        auto& ss = proc.getSessionManager().getSessionState();

        // Update position display
        int tsNum = ss.getTimeSignatureNum();
        if (tsNum <= 0) tsNum = 4;
        double beats = ss.getPlayPositionBeats();
        int bars = (int)(beats / tsNum) + 1;
        int beat = ((int)beats % tsNum) + 1;
        positionLabel.setText(juce::String(bars) + "." + juce::String(beat),
                              juce::dontSendNotification);

        // Update metadata
        tempoDisplay.setText(juce::String(ss.getTempo(), 1) + " BPM",
                             juce::dontSendNotification);
        keyDisplay.setText(ss.getKey(), juce::dontSendNotification);
        timeSigDisplay.setText(juce::String(tsNum) + "/" +
                               juce::String(ss.getTimeSignatureDen()),
                               juce::dontSendNotification);

        // Sync tempo slider
        if (!tempoSlider.isMouseButtonDown())
            tempoSlider.setValue(ss.getTempo(), juce::dontSendNotification);

        playButton.setButtonText(ss.isPlaying() ? "Pause" : "Play");

        repaint(); // For the playing indicator dot
    }
    catch (...) {}
}
