#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class TrackStatusBar : public juce::Component
{
public:
    TrackStatusBar() = default;

    void paint(juce::Graphics&) override;
    void resized() override {}

    void setStatus(int editable, int missingPlugins, int renderedStems);

private:
    int editableCount = 0;
    int missingCount = 0;
    int renderedCount = 0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TrackStatusBar)
};
