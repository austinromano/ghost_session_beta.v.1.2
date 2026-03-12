#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

class GhostSessionProcessor;

//==============================================================================
/**
 * Floating chat overlay — in-session messaging.
 */
class ChatOverlay : public juce::Component,
                    public juce::TextEditor::Listener
{
public:
    explicit ChatOverlay(GhostSessionProcessor& processor);

    void paint(juce::Graphics&) override;
    void resized() override;

    void addMessage(const juce::String& userName, const juce::String& text,
                    const juce::Colour& userColour);

private:
    GhostSessionProcessor& proc;

    struct ChatMsg { juce::String user; juce::String text; juce::Colour colour; };
    std::vector<ChatMsg> messages;

    juce::TextEditor inputField;
    juce::TextButton sendButton { "Send" };
    juce::Viewport viewport;
    juce::Component messageArea;

    void textEditorReturnKeyPressed(juce::TextEditor&) override;
    void sendCurrentMessage();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ChatOverlay)
};
