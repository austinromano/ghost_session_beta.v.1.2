#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class Sidebar : public juce::Component
{
public:
    enum Tab { Projects, Collaborators, Comments, Versions };

    Sidebar();
    void paint(juce::Graphics&) override;
    void resized() override;

    Tab getActiveTab() const { return activeTab; }
    std::function<void(Tab)> onTabChanged;

private:
    Tab activeTab = Projects;

    struct TabButton : public juce::Component
    {
        juce::String label;
        bool isActive = false;
        std::function<void()> onClick;

        TabButton(const juce::String& l) : label(l) {}
        void paint(juce::Graphics& g) override
        {
            auto bounds = getLocalBounds().toFloat();
            if (isActive)
            {
                g.setColour(GhostColours::surfaceLight);
                g.fillRoundedRectangle(bounds.reduced(4, 1), 4.0f);
                g.setColour(GhostColours::ghostGreen);
                g.fillRect(bounds.getX(), bounds.getY() + 4, 3.0f, bounds.getHeight() - 8);
            }
            g.setColour(isActive ? GhostColours::textPrimary : GhostColours::textSecondary);
            g.setFont(juce::Font(13.0f, juce::Font::plain));
            g.drawText(label, bounds.reduced(16, 0), juce::Justification::centredLeft);
        }
        void mouseDown(const juce::MouseEvent&) override { if (onClick) onClick(); }
        void mouseEnter(const juce::MouseEvent&) override { repaint(); }
        void mouseExit(const juce::MouseEvent&) override { repaint(); }
    };

    TabButton projectsTab { "Projects" };
    TabButton collabsTab  { "Collaborators" };
    TabButton commentsTab { "Comments" };
    TabButton versionsTab { "Versions" };

    void setActiveTab(Tab t);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Sidebar)
};
