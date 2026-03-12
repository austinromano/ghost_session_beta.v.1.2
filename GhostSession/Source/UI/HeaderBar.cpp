#include "HeaderBar.h"

HeaderBar::HeaderBar()
{
    inviteButton.onClick = [this] { if (onInviteClicked) onInviteClicked(); };
    addAndMakeVisible(inviteButton);
}

void HeaderBar::paint(juce::Graphics& g)
{
    g.setColour(GhostColours::surface);
    g.fillRect(getLocalBounds());

    // Bottom border
    g.setColour(GhostColours::border);
    g.drawLine(0, (float)getHeight() - 0.5f,
               (float)getWidth(), (float)getHeight() - 0.5f, 1.0f);

    // Session name
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(16.0f, juce::Font::bold));
    g.drawText("Session: " + sessionName, 16, 0, getWidth() - 120, getHeight(),
               juce::Justification::centredLeft);
}

void HeaderBar::resized()
{
    inviteButton.setBounds(getWidth() - 90, 8, 74, 28);
}

void HeaderBar::setSessionName(const juce::String& name)
{
    sessionName = name;
    repaint();
}

void HeaderBar::setInviteCode(const juce::String& code)
{
    inviteCode = code;
}
