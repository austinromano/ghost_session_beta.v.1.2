#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class WaveformDisplay : public juce::Component,
                        public juce::ChangeListener
{
public:
    WaveformDisplay();
    ~WaveformDisplay() override;

    void setThumbnailData(const std::vector<float>& peaks);
    void setAudioFile(const juce::File& file);
    void setPlaybackPosition(double position);
    void setInteractive(bool enabled) { interactive = enabled; }

    std::function<void(double)> onScrub;

    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void changeListenerCallback(juce::ChangeBroadcaster*) override;

private:
    std::vector<float> peaks;
    double playbackPosition = 0.0;
    bool interactive = false;

    juce::AudioFormatManager formatManager;
    juce::AudioThumbnailCache thumbnailCache { 3 };
    std::unique_ptr<juce::AudioThumbnail> thumbnail;
    bool useFullThumbnail = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(WaveformDisplay)
};
