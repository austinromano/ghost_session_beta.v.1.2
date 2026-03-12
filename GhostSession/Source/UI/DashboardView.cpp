#include "DashboardView.h"

DashboardView::DashboardView()
{
    addAndMakeVisible(trackStatus);
    addAndMakeVisible(commentsPanel);
    addAndMakeVisible(versionsPanel);
    addAndMakeVisible(collabPanel);
    addAndMakeVisible(pluginStatus);

    // Default: show dashboard (track status + comments + versions)
    collabPanel.setVisible(false);
}

void DashboardView::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);
}

void DashboardView::resized()
{
    auto bounds = getLocalBounds();

    // Plugin status bar at bottom
    pluginStatus.setBounds(bounds.removeFromBottom(32));

    // Track status at top
    trackStatus.setBounds(bounds.removeFromTop(64).reduced(8, 4));

    bounds.removeFromTop(4); // spacing

    switch (currentTab)
    {
        case Sidebar::Projects:
        case Sidebar::Comments:
        {
            // Dashboard layout: Comments left, Versions right
            collabPanel.setVisible(false);
            commentsPanel.setVisible(true);
            versionsPanel.setVisible(true);

            auto rightCol = bounds.removeFromRight(220);
            versionsPanel.setBounds(rightCol.reduced(4));
            commentsPanel.setBounds(bounds.reduced(4));
            break;
        }
        case Sidebar::Collaborators:
        {
            commentsPanel.setVisible(false);
            versionsPanel.setVisible(false);
            collabPanel.setVisible(true);
            collabPanel.setBounds(bounds.reduced(4));
            break;
        }
        case Sidebar::Versions:
        {
            collabPanel.setVisible(false);
            commentsPanel.setVisible(false);
            versionsPanel.setVisible(true);
            versionsPanel.setBounds(bounds.reduced(4));
            break;
        }
    }
}

void DashboardView::showTab(Sidebar::Tab tab)
{
    currentTab = tab;
    resized();
    repaint();
}
