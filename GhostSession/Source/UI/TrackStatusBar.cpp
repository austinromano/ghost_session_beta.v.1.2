#include "TrackStatusBar.h"

void TrackStatusBar::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();

    g.setColour(GhostColours::surfaceLight);
    g.fillRoundedRectangle(bounds, 6.0f);

    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("Track Status", 16, 8, 200, 18, juce::Justification::centredLeft);

    // Status pills
    int y = 32;
    int pillH = 22;
    int x = 16;

    auto drawPill = [&](const juce::String& text, juce::Colour col) {
        int w = (int)juce::Font(11.0f).getStringWidthFloat(text) + 20;
        g.setColour(col.withAlpha(0.15f));
        g.fillRoundedRectangle((float)x, (float)y, (float)w, (float)pillH, 11.0f);
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
