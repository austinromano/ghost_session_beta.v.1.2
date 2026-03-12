#pragma once

#include "JuceHeader.h"
#include "PluginProcessor.h"
#include "../UI/GhostTheme.h"
#include "../UI/LoginPanel.h"
#include "../UI/ProjectListPanel.h"
#include "../UI/ProjectView.h"
#include "../UI/HeaderBar.h"

//==============================================================================
class GhostSessionEditor : public juce::AudioProcessorEditor,
                            public juce::Timer
{
public:
    explicit GhostSessionEditor(GhostSessionProcessor&);
    ~GhostSessionEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;

private:
    GhostSessionProcessor& proc;
    GhostTheme theme;

    LoginPanel loginPanel;
    ProjectListPanel projectList;
    std::unique_ptr<ProjectView> projectView;
    InvitePopup invitePopup;

    bool loggedIn = false;
    juce::String currentProjectId;
    juce::String currentProjectName;

    void showLoginView();
    void showMainView();
    void onLoginSuccess();
    void fetchProjects();
    void openProject(const juce::String& id, const juce::String& name);
    void fetchProjectTracks();
    void handleFileDrop(const juce::File& file, const juce::String& ext);

    // Persist local file mappings per project across view recreations
    // Key: projectId -> (stemNameLower -> File)
    std::map<juce::String, std::map<juce::String, juce::File>> projectFileMap;
    void saveFileMap();
    void loadFileMap();
    static juce::File getFileMapPath();

    static constexpr int kSidebarW = 200;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GhostSessionEditor)
};
