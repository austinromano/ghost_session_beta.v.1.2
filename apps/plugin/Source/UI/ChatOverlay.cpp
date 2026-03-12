#include "ChatOverlay.h"
#include "../Core/PluginProcessor.h"

ChatOverlay::ChatOverlay(GhostSessionProcessor& processor)
    : proc(processor)
{
    inputField.setTextToShowWhenEmpty("Type a message...", GhostColours::textMuted);
    inputField.addListener(this);
    addAndMakeVisible(inputField);

    sendButton.onClick = [this] { sendCurrentMessage(); };
    addAndMakeVisible(sendButton);

    viewport.setViewedComponent(&messageArea, false);
    viewport.setScrollBarsShown(true, false);
    addAndMakeVisible(viewport);
}

void ChatOverlay::paint(juce::Graphics& g)
{
    // Semi-transparent card background
    g.setColour(GhostColours::surface.withAlpha(0.95f));
    g.fillRoundedRectangle(getLocalBounds().toFloat(), 8.0f);

    g.setColour(GhostColours::ghostGreen.withAlpha(0.3f));
    g.drawRoundedRectangle(getLocalBounds().toFloat().reduced(0.5f), 8.0f, 1.0f);

    // Header
    g.setColour(GhostColours::textSecondary);
    g.setFont(juce::Font(11.0f, juce::Font::bold));
    g.drawText("SESSION CHAT", 12, 8, getWidth() - 24, 14,
               juce::Justification::centredLeft);

    // Draw messages in the message area
    int y = 4;
    for (auto& msg : messages)
    {
        // Username
        g.setColour(msg.colour);
        g.setFont(juce::Font(11.0f, juce::Font::bold));
        g.drawText(msg.user, 8, y, getWidth() - 16, 14, juce::Justification::centredLeft);
        y += 14;

        // Message text
        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(12.0f, juce::Font::plain));
        g.drawText(msg.text, 8, y, getWidth() - 16, 16, juce::Justification::centredLeft);
        y += 20;
    }

    // Note: messageArea size is set in addMessage/resized, not here
}

void ChatOverlay::resized()
{
    auto bounds = getLocalBounds().reduced(8);
    bounds.removeFromTop(24); // header

    auto inputArea = bounds.removeFromBottom(32);
    sendButton.setBounds(inputArea.removeFromRight(52).reduced(2));
    inputField.setBounds(inputArea.reduced(2));

    viewport.setBounds(bounds);
}

void ChatOverlay::addMessage(const juce::String& userName, const juce::String& text,
                              const juce::Colour& userColour)
{
    messages.push_back({ userName, text, userColour });

    // Scroll to bottom
    int totalHeight = (int)messages.size() * 34;
    messageArea.setSize(viewport.getWidth(), juce::jmax(totalHeight, viewport.getHeight()));
    viewport.setViewPosition(0, juce::jmax(0, totalHeight - viewport.getHeight()));

    repaint();
}

void ChatOverlay::textEditorReturnKeyPressed(juce::TextEditor&)
{
    sendCurrentMessage();
}

void ChatOverlay::sendCurrentMessage()
{
    auto text = inputField.getText().trim();
    if (text.isEmpty()) return;

    proc.getSessionManager().sendChatMessage(text);

    // Show locally immediately
    auto user = proc.getAppState().getCurrentUser();
    addMessage(user.displayName, text, GhostColours::ghostGreen);

    inputField.clear();
}
