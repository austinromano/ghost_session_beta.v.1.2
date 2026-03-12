#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "TrackStatusBar.h"
#include "CommentsPanel.h"
#include "VersionsPanel.h"
#include "CollaboratorsPanel.h"
#include "PluginStatusBar.h"
#include "Sidebar.h"
#include "../Core/GhostModels.h"

//==============================================================================
class SessionsListPanel : public juce::Component
{
public:
    SessionsListPanel();
    void paint(juce::Graphics&) override;
    void resized() override;

    void setSessions(const std::vector<GhostSessionFile>& sessions);

    std::function<void()> onUploadClicked;
    std::function<void(const GhostSessionFile&)> onSessionClicked;

    void mouseDown(const juce::MouseEvent& e) override;

private:
    std::vector<GhostSessionFile> sessions;
    juce::TextButton uploadButton { "Upload Session" };

    int getRowAtPosition(int y) const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SessionsListPanel)
};

//==============================================================================
class DashboardView : public juce::Component
{
public:
    DashboardView();
    void paint(juce::Graphics&) override;
    void resized() override;

    void showTab(Sidebar::Tab tab);

    // Access sub-panels for data binding
    TrackStatusBar& getTrackStatus()           { return trackStatus; }
    CommentsPanel& getComments()               { return commentsPanel; }
    VersionsPanel& getVersions()               { return versionsPanel; }
    CollaboratorsPanel& getCollaborators()      { return collabPanel; }
    PluginStatusBar& getPluginStatus()          { return pluginStatus; }
    SessionsListPanel& getSessionsList()       { return sessionsPanel; }

private:
    TrackStatusBar trackStatus;
    SessionsListPanel sessionsPanel;
    CommentsPanel commentsPanel;
    VersionsPanel versionsPanel;
    CollaboratorsPanel collabPanel;
    PluginStatusBar pluginStatus;

    Sidebar::Tab currentTab = Sidebar::Projects;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DashboardView)
};
