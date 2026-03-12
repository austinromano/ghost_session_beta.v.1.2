#include "HeaderBar.h"

//==============================================================================
// InvitePopup
//==============================================================================
InvitePopup::InvitePopup()
{
    emailField.setTextToShowWhenEmpty("Email address", GhostColours::textMuted);
    emailField.setJustification(juce::Justification::centredLeft);
    emailField.onReturnKey = [this] { handleInvite(); };
    addAndMakeVisible(emailField);

    nameField.setTextToShowWhenEmpty("or Producer name", GhostColours::textMuted);
    nameField.setJustification(juce::Justification::centredLeft);
    nameField.onReturnKey = [this] { handleInvite(); };
    addAndMakeVisible(nameField);

    sendButton.onClick = [this] { handleInvite(); };
    addAndMakeVisible(sendButton);

    closeButton.onClick = [this] { setVisible(false); };
    addAndMakeVisible(closeButton);

    statusLabel.setFont(juce::Font(11.0f));
    statusLabel.setJustificationType(juce::Justification::centredLeft);
    addAndMakeVisible(statusLabel);

    setVisible(false);
}

void InvitePopup::paint(juce::Graphics& g)
{
    // Drop shadow
    g.setColour(juce::Colours::black.withAlpha(0.3f));
    g.fillRoundedRectangle(getLocalBounds().toFloat().translated(2, 2), 8.0f);

    // Card background
    auto bounds = getLocalBounds().toFloat();
    g.setColour(GhostColours::surface);
    g.fillRoundedRectangle(bounds, 8.0f);
    g.setColour(GhostColours::ghostGreen.withAlpha(0.4f));
    g.drawRoundedRectangle(bounds.reduced(0.5f), 8.0f, 1.0f);

    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(14.0f, juce::Font::bold));
    g.drawText("Invite Collaborator", 16, 10, getWidth() - 50, 20,
               juce::Justification::centredLeft);
}

void InvitePopup::resized()
{
    auto area = getLocalBounds().reduced(16);
    closeButton.setBounds(getWidth() - 32, 8, 24, 24);

    area.removeFromTop(36); // title space

    emailField.setBounds(area.removeFromTop(30));
    area.removeFromTop(6);
    nameField.setBounds(area.removeFromTop(30));
    area.removeFromTop(6);
    statusLabel.setBounds(area.removeFromTop(16));
    area.removeFromTop(6);
    sendButton.setBounds(area.removeFromTop(32));
}

void InvitePopup::setError(const juce::String& msg)
{
    statusLabel.setColour(juce::Label::textColourId, GhostColours::errorRed);
    statusLabel.setText(msg, juce::dontSendNotification);
}

void InvitePopup::setSuccess(const juce::String& msg)
{
    statusLabel.setColour(juce::Label::textColourId, GhostColours::onlineGreen);
    statusLabel.setText(msg, juce::dontSendNotification);
    emailField.clear();
    nameField.clear();
}

void InvitePopup::reset()
{
    emailField.clear();
    nameField.clear();
    statusLabel.setText({}, juce::dontSendNotification);
}

void InvitePopup::handleInvite()
{
    auto email = emailField.getText().trim();
    auto name = nameField.getText().trim();

    if (email.isEmpty() && name.isEmpty())
    {
        setError("Enter an email or producer name");
        return;
    }

    statusLabel.setText({}, juce::dontSendNotification);

    if (onInvite)
        onInvite(email, name, "editor");
}

//==============================================================================
// HeaderBar
//==============================================================================
HeaderBar::HeaderBar()
{
    backButton.onClick = [this] { if (onBackClicked) onBackClicked(); };
    addChildComponent(backButton);

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

    // Project name
    int textX = showBackButton ? 90 : 16;
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(16.0f, juce::Font::bold));
    g.drawText(sessionName, textX, 0, getWidth() - textX - 100, getHeight(),
               juce::Justification::centredLeft);
}

void HeaderBar::resized()
{
    backButton.setBounds(8, 8, 74, 28);
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

void HeaderBar::setShowBack(bool show)
{
    showBackButton = show;
    backButton.setVisible(show);
    repaint();
}
