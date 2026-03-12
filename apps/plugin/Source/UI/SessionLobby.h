#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
/**
 * SessionLobby — The landing screen before entering a session.
 *
 * Shows:
 *   - Ghost Session logo + branding
 *   - "Start Session" button (creates a new session as host)
 *   - "Join Session" button + code input field
 *   - Recent sessions list
 *   - Pending invitations
 *
 * This replaces the main view when no session is active.
 */
class SessionLobby : public juce::Component
{
public:
    SessionLobby();
    ~SessionLobby() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

    // Callbacks
    std::function<void(const juce::String& name, double tempo, const juce::String& key)> onStartSession;
    std::function<void(const juce::String& code)> onJoinSession;

    // Show/hide pending invitations
    void addInvitation(const juce::String& sessionCode, const juce::String& hostName);

private:
    juce::TextButton startButton   { "Start Session" };
    juce::TextButton joinButton    { "Join Session" };
    juce::TextEditor sessionCodeField;
    juce::TextEditor sessionNameField;
    juce::TextEditor tempoField;
    juce::ComboBox   keySelector;

    juce::Label titleLabel;
    juce::Label subtitleLabel;
    juce::Label orLabel;
    juce::Label nameLabel;
    juce::Label tempoLabel;
    juce::Label keyLabel;

    struct Invitation
    {
        juce::String sessionCode;
        juce::String hostName;
    };
    std::vector<Invitation> invitations;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SessionLobby)
};
