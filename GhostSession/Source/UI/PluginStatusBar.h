#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "../Core/GhostModels.h"

//==============================================================================
class PluginStatusBar : public juce::Component
{
public:
    PluginStatusBar() = default;
    void paint(juce::Graphics&) override;
    void resized() override {}

    void setPlugins(const std::vector<GhostPluginInfo>& plugins);

private:
    std::vector<GhostPluginInfo> plugins;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginStatusBar)
};
