#include "VersionsPanel.h"

void VersionsPanel::paint(juce::Graphics& g)
{
    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("Version History", 12, 8, getWidth() - 24, 18,
               juce::Justification::centredLeft);

    // Restore button area (top right)
    {
        auto restoreArea = juce::Rectangle<int>(getWidth() - 80, 6, 68, 22);
        g.setColour(GhostColours::ghostGreen.withAlpha(0.15f));
        g.fillRoundedRectangle(restoreArea.toFloat(), 4.0f);
        g.setColour(GhostColours::ghostGreen);
        g.setFont(juce::Font(11.0f, juce::Font::bold));
        g.drawText("Restore", restoreArea, juce::Justification::centred);
    }

    // Version list
    int y = 36;
    for (auto& v : versions)
    {
        if (y > getHeight() - 10) break;

        bool isLatest = (&v == &versions.front());

        // Version badge
        juce::String badge = "v" + juce::String(v.versionNum);
        auto badgeCol = isLatest ? GhostColours::ghostGreen : GhostColours::textMuted;

        g.setColour(badgeCol);
        g.setFont(juce::Font(12.0f, juce::Font::bold));
        g.drawText(badge, 12, y, 30, 18, juce::Justification::centredLeft);

        // Label
        g.setColour(isLatest ? GhostColours::textPrimary : GhostColours::textSecondary);
        g.setFont(juce::Font(12.0f, isLatest ? juce::Font::bold : juce::Font::plain));
        g.drawText("\"" + v.label + "\"", 46, y, getWidth() - 58, 18,
                   juce::Justification::centredLeft);

        // Author
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(10.0f, juce::Font::plain));
        g.drawText(v.authorName, 46, y + 18, getWidth() - 58, 14,
                   juce::Justification::centredLeft);

        // Timeline dot
        g.setColour(badgeCol);
        g.fillEllipse(6.0f, (float)y + 4.0f, 4.0f, 4.0f);

        // Timeline line (except last)
        if (&v != &versions.back())
        {
            g.setColour(GhostColours::border);
            g.drawLine(8.0f, (float)y + 10.0f, 8.0f, (float)y + 38.0f, 1.0f);
        }

        y += 40;
    }

    if (versions.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::italic));
        g.drawText("No versions yet", getLocalBounds().reduced(12),
                   juce::Justification::centred);
    }
}

void VersionsPanel::setVersions(const std::vector<GhostVersion>& v)
{
    versions = v;
    repaint();
}
