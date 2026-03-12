#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "../Core/GhostModels.h"

//==============================================================================
class VersionsPanel : public juce::Component
{
public:
    VersionsPanel() = default;
    void paint(juce::Graphics&) override;
    void resized() override {}

    void setVersions(const std::vector<GhostVersion>& versions);

    std::function<void(const juce::String& versionId)> onRestore;

private:
    std::vector<GhostVersion> versions;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(VersionsPanel)
};
