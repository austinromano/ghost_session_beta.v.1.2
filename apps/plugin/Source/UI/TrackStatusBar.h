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
    void setSessionName(const juce::String& name);

private:
    int editableCount = 0;
    int missingCount = 0;
    int renderedCount = 0;
    juce::String currentSessionName;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TrackStatusBar)
};
