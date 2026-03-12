#include "LoginPanel.h"

LoginPanel::LoginPanel()
{
    emailField.setTextToShowWhenEmpty("Email", GhostColours::textMuted);
    emailField.setJustification(juce::Justification::centredLeft);
    addAndMakeVisible(emailField);

    passwordField.setTextToShowWhenEmpty("Password", GhostColours::textMuted);
    passwordField.setPasswordCharacter(0x2022);  // bullet
    addAndMakeVisible(passwordField);

    nameField.setTextToShowWhenEmpty("Display Name", GhostColours::textMuted);
    addChildComponent(nameField); // hidden initially

    loginButton.onClick = [this] { handleAction(); };
    addAndMakeVisible(loginButton);

    registerButton.onClick = [this] { handleAction(); };
    addChildComponent(registerButton);

    toggleButton.onClick = [this] {
        showRegister = !showRegister;
        toggleButton.setButtonText(showRegister ? "Already have an account? Sign In" : "No account? Register");
        nameField.setVisible(showRegister);
        loginButton.setVisible(!showRegister);
        registerButton.setVisible(showRegister);
        resized();
    };
    addAndMakeVisible(toggleButton);

    errorLabel.setColour(juce::Label::textColourId, GhostColours::errorRed);
    errorLabel.setFont(juce::Font(12.0f));
    errorLabel.setJustificationType(juce::Justification::centred);
    addAndMakeVisible(errorLabel);

    // Allow Enter key to submit
    passwordField.onReturnKey = [this] { handleAction(); };
    nameField.onReturnKey = [this] { handleAction(); };
}

void LoginPanel::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);

    auto area = getLocalBounds().toFloat();

    // Card background
    auto card = area.reduced(area.getWidth() * 0.25f, area.getHeight() * 0.15f);
    g.setColour(GhostColours::surface);
    g.fillRoundedRectangle(card, 12.0f);
    g.setColour(GhostColours::border);
    g.drawRoundedRectangle(card, 12.0f, 1.0f);

    // Title
    auto titleTop = card.removeFromTop(60).translated(0, 20);
    g.setColour(GhostColours::ghostGreen);
    g.setFont(juce::Font(24.0f, juce::Font::bold));
    g.drawText("Ghost Session", titleTop, juce::Justification::centred);

    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(12.0f));
    g.drawText(showRegister ? "Create your account" : "Sign in to your account",
               titleTop.translated(0, 28), juce::Justification::centred);
}

void LoginPanel::resized()
{
    auto area = getLocalBounds().reduced(getWidth() / 4, getHeight() / 6);
    area.removeFromTop(90); // title space
    area = area.reduced(40, 0);

    int fieldH = 34;
    int gap = 10;

    emailField.setBounds(area.removeFromTop(fieldH));
    area.removeFromTop(gap);

    passwordField.setBounds(area.removeFromTop(fieldH));
    area.removeFromTop(gap);

    if (showRegister)
    {
        nameField.setBounds(area.removeFromTop(fieldH));
        area.removeFromTop(gap);
    }

    errorLabel.setBounds(area.removeFromTop(20));
    area.removeFromTop(gap);

    if (showRegister)
        registerButton.setBounds(area.removeFromTop(36));
    else
        loginButton.setBounds(area.removeFromTop(36));

    area.removeFromTop(gap);
    toggleButton.setBounds(area.removeFromTop(24));
}

void LoginPanel::setError(const juce::String& msg)
{
    errorLabel.setText(msg, juce::dontSendNotification);
}

void LoginPanel::setLoading(bool loading)
{
    isLoading = loading;
    loginButton.setEnabled(!loading);
    registerButton.setEnabled(!loading);
    loginButton.setButtonText(loading ? "Signing in..." : "Sign In");
    registerButton.setButtonText(loading ? "Creating..." : "Create Account");
}

void LoginPanel::handleAction()
{
    if (isLoading) return;

    auto email = emailField.getText().trim();
    auto password = passwordField.getText();

    if (email.isEmpty() || password.isEmpty())
    {
        setError("Please enter email and password");
        return;
    }

    setError({});

    if (showRegister)
    {
        auto name = nameField.getText().trim();
        if (name.isEmpty())
        {
            setError("Please enter a display name");
            return;
        }
        if (onRegister) onRegister(email, password, name);
    }
    else
    {
        if (onLogin) onLogin(email, password);
    }
}
