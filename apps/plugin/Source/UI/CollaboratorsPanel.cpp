#include "CollaboratorsPanel.h"

void CollaboratorsPanel::paint(juce::Graphics& g)
{
    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("Collaborators (" + juce::String((int)collaborators.size()) + ")",
               12, 8, getWidth() - 24, 18, juce::Justification::centredLeft);

    int y = 40;
    for (size_t i = 0; i < collaborators.size(); ++i)
    {
        if (y > getHeight() - 20) break;
        auto& c = collaborators[i];

        auto col = c.colour.isTransparent()
            ? GhostColours::collabColours[i % GhostColours::numCollabColours]
            : c.colour;

        // Avatar circle
        g.setColour(col.withAlpha(0.3f));
        g.fillEllipse(16.0f, (float)y, 36.0f, 36.0f);
        g.setColour(col);
        g.setFont(juce::Font(15.0f, juce::Font::bold));
        g.drawText(c.displayName.substring(0, 1).toUpperCase(),
                   16, y, 36, 36, juce::Justification::centred);

        // Online dot
        g.setColour(c.isOnline ? GhostColours::onlineGreen : GhostColours::textMuted);
        g.fillEllipse(44.0f, (float)y + 28.0f, 8.0f, 8.0f);

        // Name
        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(13.0f, juce::Font::plain));
        g.drawText(c.displayName, 62, y + 2, getWidth() - 74, 16,
                   juce::Justification::centredLeft);

        // Role
        if (c.role == "owner")
        {
            g.setColour(GhostColours::hostGold);
            g.setFont(juce::Font(10.0f, juce::Font::bold));
            g.drawText("OWNER", 62, y + 20, 50, 12, juce::Justification::centredLeft);
        }
        else
        {
            g.setColour(GhostColours::textMuted);
            g.setFont(juce::Font(10.0f, juce::Font::plain));
            juce::String roleText = c.role.isEmpty() ? "editor" : c.role;
            g.drawText(roleText, 62, y + 20, 60, 12, juce::Justification::centredLeft);
        }

        y += 52;
    }

    if (collaborators.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::italic));
        g.drawText("No collaborators yet", getLocalBounds().reduced(12),
                   juce::Justification::centred);
    }
}

void CollaboratorsPanel::setCollaborators(const std::vector<GhostCollaborator>& c)
{
    collaborators = c;
    repaint();
}
