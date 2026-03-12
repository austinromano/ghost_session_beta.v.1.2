#include "GhostTheme.h"

GhostTheme::GhostTheme()
{
    setColour(juce::ResizableWindow::backgroundColourId, GhostColours::background);
    setColour(juce::TextEditor::backgroundColourId,      GhostColours::surface);
    setColour(juce::TextEditor::textColourId,            GhostColours::textPrimary);
    setColour(juce::TextEditor::outlineColourId,         GhostColours::border);
    setColour(juce::TextEditor::focusedOutlineColourId,  GhostColours::ghostGreen);
    setColour(juce::TextEditor::highlightColourId,       GhostColours::ghostGreen.withAlpha(0.2f));
    setColour(juce::Label::textColourId,                 GhostColours::textPrimary);
    setColour(juce::ListBox::backgroundColourId,         GhostColours::surface);
    setColour(juce::ScrollBar::thumbColourId,            GhostColours::textMuted);
    setColour(juce::ComboBox::backgroundColourId,        GhostColours::surface);
    setColour(juce::ComboBox::textColourId,              GhostColours::textPrimary);
    setColour(juce::ComboBox::outlineColourId,           GhostColours::border);
    setColour(juce::Slider::backgroundColourId,          GhostColours::surface);
    setColour(juce::Slider::trackColourId,               GhostColours::ghostGreen);
    setColour(juce::Slider::thumbColourId,               GhostColours::ghostGreen);
}

void GhostTheme::drawButtonBackground(juce::Graphics& g, juce::Button& button,
                                        const juce::Colour&, bool isOver, bool isDown)
{
    auto bounds = button.getLocalBounds().toFloat().reduced(1.0f);
    float cr = 6.0f;

    juce::Colour bg = GhostColours::surface;
    if (isDown)        bg = GhostColours::ghostGreen.withAlpha(0.25f);
    else if (isOver)   bg = GhostColours::surfaceHover;
    if (button.getToggleState()) bg = GhostColours::ghostGreen.withAlpha(0.2f);

    g.setColour(bg);
    g.fillRoundedRectangle(bounds, cr);

    auto borderCol = button.getToggleState() ? GhostColours::ghostGreen : GhostColours::border;
    g.setColour(borderCol);
    g.drawRoundedRectangle(bounds, cr, 1.0f);
}

void GhostTheme::drawButtonText(juce::Graphics& g, juce::TextButton& button,
                                  bool, bool)
{
    g.setColour(button.getToggleState() ? GhostColours::ghostGreen : GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::plain));
    g.drawText(button.getButtonText(), button.getLocalBounds(),
               juce::Justification::centred, true);
}

void GhostTheme::drawScrollbar(juce::Graphics& g, juce::ScrollBar&,
                                 int x, int y, int width, int height,
                                 bool isVert, int thumbStart, int thumbSize,
                                 bool isOver, bool isDown)
{
    auto col = isDown ? GhostColours::ghostGreen :
               isOver ? GhostColours::textSecondary : GhostColours::textMuted;

    juce::Rectangle<int> thumb;
    if (isVert) thumb = { x + 2, thumbStart, width - 4, thumbSize };
    else        thumb = { thumbStart, y + 2, thumbSize, height - 4 };

    g.setColour(col);
    g.fillRoundedRectangle(thumb.toFloat(), 3.0f);
}

void GhostTheme::fillTextEditorBackground(juce::Graphics& g, int w, int h,
                                            juce::TextEditor&)
{
    g.setColour(GhostColours::surfaceLight);
    g.fillRoundedRectangle(0.0f, 0.0f, (float)w, (float)h, 4.0f);
}

void GhostTheme::drawTextEditorOutline(juce::Graphics& g, int w, int h,
                                         juce::TextEditor& ed)
{
    auto col = ed.hasKeyboardFocus(true) ? GhostColours::ghostGreen : GhostColours::border;
    g.setColour(col);
    g.drawRoundedRectangle(0.5f, 0.5f, (float)w - 1.0f, (float)h - 1.0f, 4.0f, 1.0f);
}
