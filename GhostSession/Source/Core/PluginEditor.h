#pragma once

#include "JuceHeader.h"
#include "PluginProcessor.h"
#include "../UI/GhostTheme.h"
#include "../UI/Sidebar.h"
#include "../UI/HeaderBar.h"
#include "../UI/DashboardView.h"

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

    Sidebar sidebar;
    HeaderBar headerBar;
    DashboardView dashboard;

    bool dataLoaded = false;
    juce::String currentSessionId;

    void fetchSessionData();
    void autoLogin();

    static constexpr int kSidebarWidth = 160;
    static constexpr int kHeaderHeight = 44;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GhostSessionEditor)
};
