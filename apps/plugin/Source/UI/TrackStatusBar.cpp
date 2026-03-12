#include "TrackStatusBar.h"

void TrackStatusBar::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();

    g.setColour(GhostColours::surfaceLight);
    g.fillRoundedRectangle(bounds, 6.0f);

    // Session name on the left
    if (currentSessionName.isNotEmpty())
    {
        g.setColour(GhostColours::ghostGreen);
        g.setFont(juce::Font(13.0f, juce::Font::bold));
        g.drawText(currentSessionName, 16, 8, 300, 18, juce::Justification::centredLeft);
    }

    // Title "Track Status" right of session name
    int titleX = currentSessionName.isNotEmpty() ? 16 : 16;
    int titleY = currentSessionName.isNotEmpty() ? 30 : 8;

    g.setColour(GhostColours::textSecondary);
    g.setFont(juce::Font(11.0f, juce::Font::bold));
    g.drawText("Track Status", titleX, titleY, 200, 14, juce::Justification::centredLeft);

    // Status pills
    int y = titleY + 16;
    int pillH = 20;
    int x = 16;

    auto drawPill = [&](const juce::String& text, juce::Colour col) {
        int w = (int)juce::Font(11.0f).getStringWidthFloat(text) + 20;
        g.setColour(col.withAlpha(0.15f));
        g.fillRoundedRectangle((float)x, (float)y, (float)w, (float)pillH, 10.0f);
        g.setColour(col);
        g.setFont(juce::Font(11.0f, juce::Font::bold));
        g.drawText(text, x, y, w, pillH, juce::Justification::centred);
        x += w + 8;
    };

    drawPill(juce::String(editableCount) + " Editable", GhostColours::editableGreen);
    drawPill(juce::String(missingCount) + " Missing Plugins", GhostColours::missingAmber);
    drawPill(juce::String(renderedCount) + " Rendered Stems", GhostColours::renderedBlue);
}

void TrackStatusBar::setStatus(int editable, int missingPlugins, int renderedStems)
{
    editableCount = editable;
    missingCount = missingPlugins;
    renderedCount = renderedStems;
    repaint();
}

void TrackStatusBar::setSessionName(const juce::String& name)
{
    currentSessionName = name;
    repaint();
}
