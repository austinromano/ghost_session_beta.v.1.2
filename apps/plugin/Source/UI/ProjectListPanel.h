#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class ProjectListPanel : public juce::Component
{
public:
    struct ProjectItem
    {
        juce::String id;
        juce::String name;
        double tempo = 140.0;
        juce::String key = "C";
    };

    ProjectListPanel();
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent&) override;

    void setProjects(const std::vector<ProjectItem>& projects);
    void setSelectedId(const juce::String& id);

    std::function<void(const ProjectItem&)> onProjectSelected;
    std::function<void(const ProjectItem&)> onDeleteProject;
    std::function<void()> onCreateClicked;

private:
    std::vector<ProjectItem> projects;
    juce::String selectedId;
    juce::TextButton createButton { "+ New Project" };

    int getRowAt(int y) const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ProjectListPanel)
};
