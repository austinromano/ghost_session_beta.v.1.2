#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class InvitePopup : public juce::Component
{
public:
    InvitePopup();
    void paint(juce::Graphics&) override;
    void resized() override;

    std::function<void(const juce::String& email, const juce::String& name, const juce::String& role)> onInvite;

    void setError(const juce::String& msg);
    void setSuccess(const juce::String& msg);
    void reset();

private:
    juce::TextEditor emailField;
    juce::TextEditor nameField;
    juce::TextButton sendButton { "Add to Project" };
    juce::TextButton closeButton { "X" };
    juce::Label statusLabel;

    void handleInvite();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InvitePopup)
};

//==============================================================================
class HeaderBar : public juce::Component
{
public:
    HeaderBar();
    void paint(juce::Graphics&) override;
    void resized() override;

    void setSessionName(const juce::String& name);
    void setInviteCode(const juce::String& code);
    void setShowBack(bool show);

    std::function<void()> onInviteClicked;
    std::function<void()> onBackClicked;

private:
    juce::String sessionName = "No Session";
    juce::String inviteCode;
    bool showBackButton = false;
    juce::TextButton backButton { "<  Back" };
    juce::TextButton inviteButton { "Invite" };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HeaderBar)
};
