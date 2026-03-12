#pragma once

#include "JuceHeader.h"
#include "../Core/AppState.h"

//==============================================================================
class AuthManager : public juce::Timer
{
public:
    explicit AuthManager(AppState& state);
    ~AuthManager() override;

    bool isAuthenticated() const;
    juce::String getAccessToken() const;

    void loginWithEmail(const juce::String& email, const juce::String& password,
                        std::function<void(bool, const juce::String&)> cb);
    void registerAccount(const juce::String& email, const juce::String& password,
                         const juce::String& displayName,
                         std::function<void(bool, const juce::String&)> cb);
    void logout();
    void refreshToken();
    void timerCallback() override;

private:
    AppState& appState;
    juce::String accessToken;
    juce::String refreshTokenStr;
    juce::Time tokenExpiry;
    mutable juce::CriticalSection lock;
    juce::ThreadPool pool { 1 };

    void attemptRestore();
    void autoLogin();
};
