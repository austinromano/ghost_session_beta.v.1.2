#pragma once

#include "JuceHeader.h"
#include "../Core/AppState.h"

//==============================================================================
class ApiClient
{
public:
    explicit ApiClient(AppState& state);

    struct Response
    {
        int statusCode = 0;
        juce::var body;
        juce::String error;
        bool isSuccess() const { return statusCode >= 200 && statusCode < 300; }
    };

    using Callback = std::function<void(const Response&)>;

    // Session endpoints
    void createSession(const juce::var& data, Callback cb);
    void joinSession(const juce::var& data, Callback cb);
    void endSession(const juce::String& sessionId, Callback cb);
    void inviteToSession(const juce::var& data, Callback cb);

    // File endpoints
    void uploadFile(const juce::File& file, const juce::var& metadata,
                    std::function<void(float)> progress, Callback cb);
    void getDownloadUrl(const juce::String& fileId, Callback cb);

    // Auth endpoints
    void login(const juce::String& email, const juce::String& password, Callback cb);
    void registerUser(const juce::String& email, const juce::String& password,
                      const juce::String& displayName, Callback cb);

private:
    AppState& appState;
    juce::String baseUrl = "http://localhost:3000/v1";
    juce::ThreadPool pool { 4 };

    void makeRequest(const juce::String& method, const juce::String& endpoint,
                     const juce::var& body, Callback cb);
};
