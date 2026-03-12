#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "../Core/GhostModels.h"

//==============================================================================
class CollaboratorsPanel : public juce::Component
{
public:
    CollaboratorsPanel() = default;
    void paint(juce::Graphics&) override;
    void resized() override {}

    void setCollaborators(const std::vector<GhostCollaborator>& collabs);

private:
    std::vector<GhostCollaborator> collaborators;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CollaboratorsPanel)
};
