#include "Sidebar.h"

Sidebar::Sidebar()
{
    auto setupTab = [this](TabButton& btn, Tab tab) {
        btn.onClick = [this, tab] { setActiveTab(tab); };
        addAndMakeVisible(btn);
    };

    setupTab(projectsTab, Projects);
    setupTab(collabsTab, Collaborators);
    setupTab(commentsTab, Comments);
    setupTab(versionsTab, Versions);

    projectsTab.isActive = true;
}

void Sidebar::paint(juce::Graphics& g)
{
    g.setColour(GhostColours::surface);
    g.fillRect(getLocalBounds());

    // Right border
    g.setColour(GhostColours::border);
    g.drawLine((float)getWidth() - 0.5f, 0,
               (float)getWidth() - 0.5f, (float)getHeight(), 1.0f);

    // Ghost icon + title at top
    g.setColour(GhostColours::ghostGreen);
    g.fillEllipse(16.0f, 14.0f, 24.0f, 24.0f);
    g.setColour(GhostColours::surface);
    g.fillEllipse(20.0f, 18.0f, 16.0f, 16.0f);
    g.setColour(GhostColours::ghostGreen);
    g.fillEllipse(24.0f, 22.0f, 8.0f, 8.0f);

    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(14.0f, juce::Font::bold));
    g.drawText("Ghost Session", 48, 14, getWidth() - 56, 24,
               juce::Justification::centredLeft);
}

void Sidebar::resized()
{
    int y = 56;
    int h = 36;
    int w = getWidth();

    projectsTab.setBounds(0, y, w, h); y += h;
    collabsTab.setBounds(0, y, w, h);  y += h;
    commentsTab.setBounds(0, y, w, h); y += h;
    versionsTab.setBounds(0, y, w, h);
}

void Sidebar::setActiveTab(Tab t)
{
    activeTab = t;
    projectsTab.isActive = (t == Projects);
    collabsTab.isActive  = (t == Collaborators);
    commentsTab.isActive = (t == Comments);
    versionsTab.isActive = (t == Versions);

    projectsTab.repaint();
    collabsTab.repaint();
    commentsTab.repaint();
    versionsTab.repaint();

    if (onTabChanged) onTabChanged(t);
}
