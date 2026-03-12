#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class HeaderBar : public juce::Component
{
public:
    HeaderBar();
    void paint(juce::Graphics&) override;
    void resized() override;

    void setSessionName(const juce::String& name);
    void setInviteCode(const juce::String& code);

    std::function<void()> onInviteClicked;

private:
    juce::String sessionName = "No Session";
    juce::String inviteCode;
    juce::TextButton inviteButton { "Invite" };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HeaderBar)
};
