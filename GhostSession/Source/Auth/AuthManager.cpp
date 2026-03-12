#include "AuthManager.h"
#include "../Core/GhostLog.h"

AuthManager::AuthManager(AppState& state) : appState(state)
{
    // Auto-login immediately with the system username
    GhostLog::write("[Auth] AuthManager constructor, calling autoLogin");
    autoLogin();
}

AuthManager::~AuthManager() { stopTimer(); }

bool AuthManager::isAuthenticated() const
{
    const juce::ScopedLock sl(lock);
    return accessToken.isNotEmpty();
}

juce::String AuthManager::getAccessToken() const
{
    const juce::ScopedLock sl(lock);
    return accessToken;
}

void AuthManager::loginWithEmail(const juce::String& email, const juce::String& password,
                                  std::function<void(bool, const juce::String&)> cb)
{
    pool.addJob([this, email, cb = std::move(cb)]() mutable
    {
        // Call the real auth endpoint
        juce::URL url("http://localhost:3000/v1/auth/login");

        auto* body = new juce::DynamicObject();
        body->setProperty("email", email);
        body->setProperty("displayName", email.upToFirstOccurrenceOf("@", false, false));

        url = url.withPOSTData(juce::JSON::toString(juce::var(body)));

        auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
            .withExtraHeaders("Content-Type: application/json")
            .withConnectionTimeoutMs(10000);

        if (auto stream = url.createInputStream(options))
        {
            auto response = juce::JSON::parse(stream->readEntireStreamAsString());
            auto token = response["token"].toString();
            auto userId = response["userId"].toString();
            auto displayName = response["displayName"].toString();

            if (token.isNotEmpty())
            {
                {
                    const juce::ScopedLock sl(lock);
                    accessToken = token;
                }

                ProducerProfile profile;
                profile.userId = userId;
                profile.displayName = displayName;
                profile.isOnline = true;
                profile.colour = juce::Colour(0xFF00FFC8);

                juce::MessageManager::callAsync([this, profile, token, cb = std::move(cb)]() {
                    appState.setCurrentUser(profile);
                    appState.setAuthToken(token);
                    if (cb) cb(true, {});
                });
                return;
            }
        }

        juce::MessageManager::callAsync([cb = std::move(cb)]() {
            if (cb) cb(false, "Login failed");
        });
    });
}

void AuthManager::registerAccount(const juce::String& email, const juce::String& password,
                                   const juce::String& displayName,
                                   std::function<void(bool, const juce::String&)> cb)
{
    loginWithEmail(email, password, std::move(cb));
}

void AuthManager::logout()
{
    const juce::ScopedLock sl(lock);
    accessToken.clear();
    refreshTokenStr.clear();
    appState.setAuthToken({});
}

void AuthManager::refreshToken()
{
    // Token doesn't expire in our simple server
}

void AuthManager::timerCallback()
{
    if (isAuthenticated())
        refreshToken();
}

void AuthManager::attemptRestore()
{
    // Not needed — we auto-login
}

void AuthManager::autoLogin()
{
    // Use system username as display name
    auto systemUser = juce::SystemStats::getLogonName();
    if (systemUser.isEmpty())
        systemUser = "Producer";

    loginWithEmail(systemUser + "@ghost.local", "",
        [this](bool success, const juce::String&) {
            if (success)
                DBG("[Auth] Auto-logged in as: " + appState.getCurrentUser().displayName);
            else
                DBG("[Auth] Auto-login failed (server may not be running)");
        });
}
