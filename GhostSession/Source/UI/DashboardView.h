#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "TrackStatusBar.h"
#include "CommentsPanel.h"
#include "VersionsPanel.h"
#include "CollaboratorsPanel.h"
#include "PluginStatusBar.h"
#include "Sidebar.h"

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

private:
    TrackStatusBar trackStatus;
    CommentsPanel commentsPanel;
    VersionsPanel versionsPanel;
    CollaboratorsPanel collabPanel;
    PluginStatusBar pluginStatus;

    Sidebar::Tab currentTab = Sidebar::Projects;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DashboardView)
};
