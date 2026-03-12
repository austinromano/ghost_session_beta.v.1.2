#include "PluginStatusBar.h"

void PluginStatusBar::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();

    g.setColour(GhostColours::surface);
    g.fillRect(bounds);

    // Top border
    g.setColour(GhostColours::border);
    g.drawLine(0, 0.5f, bounds.getWidth(), 0.5f, 1.0f);

    // Label
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("Plugin Status", 12, 0, 100, (int)bounds.getHeight(),
               juce::Justification::centredLeft);

    // Plugin pills
    int x = 116;
    for (auto& p : plugins)
    {
        juce::Colour statusCol;
        juce::String statusStr;
        switch (p.status)
        {
            case GhostPluginInfo::Status::Loaded:   statusCol = GhostColours::editableGreen; statusStr = "Loaded"; break;
            case GhostPluginInfo::Status::Missing:  statusCol = GhostColours::errorRed;      statusStr = "Missing"; break;
            case GhostPluginInfo::Status::Rendered: statusCol = GhostColours::renderedBlue;  statusStr = "Rendered"; break;
        }

        juce::String text = p.name + ": " + statusStr;
        int w = (int)juce::Font(10.0f).getStringWidthFloat(text) + 16;

        // Pill background
        g.setColour(statusCol.withAlpha(0.12f));
        g.fillRoundedRectangle((float)x, 6.0f, (float)w, bounds.getHeight() - 12.0f, 4.0f);

        // Text
        g.setColour(statusCol);
        g.setFont(juce::Font(10.0f, juce::Font::bold));
        g.drawText(text, x, 0, w, (int)bounds.getHeight(), juce::Justification::centred);

        x += w + 8;
    }
}

void PluginStatusBar::setPlugins(const std::vector<GhostPluginInfo>& p)
{
    plugins = p;
    repaint();
}
