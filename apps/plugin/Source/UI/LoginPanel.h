#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

//==============================================================================
class LoginPanel : public juce::Component
{
public:
    LoginPanel();

    void paint(juce::Graphics&) override;
    void resized() override;

    // Callbacks
    std::function<void(const juce::String& email, const juce::String& password)> onLogin;
    std::function<void(const juce::String& email, const juce::String& password, const juce::String& name)> onRegister;

    void setError(const juce::String& msg);
    void setLoading(bool loading);

private:
    juce::TextEditor emailField, passwordField, nameField;
    juce::TextButton loginButton { "Sign In" };
    juce::TextButton registerButton { "Create Account" };
    juce::TextButton toggleButton { "No account? Register" };
    juce::Label errorLabel;

    bool showRegister = false;
    bool isLoading = false;

    void handleAction();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(LoginPanel)
};
