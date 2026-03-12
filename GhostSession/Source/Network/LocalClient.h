#pragma once

#include "JuceHeader.h"

//==============================================================================
/**
    HTTP client for communicating with the Ghost Session backend server.
    Uses juce::URL and juce::ThreadPool for async HTTP requests.
*/
class LocalClient
{
public:
    LocalClient();

    void setAuthToken (const juce::String& token);

    // Auth
    void login (const juce::String& email, const juce::String& password,
                std::function<void (bool success, const juce::var& response)> callback);
    void registerUser (const juce::String& email, const juce::String& password,
                       const juce::String& displayName,
                       std::function<void (bool success, const juce::var& response)> callback);

    // Sessions
    void getSessions (std::function<void (bool, const juce::var&)> cb);
    void createSession (const juce::String& name, const juce::String& dawType,
                        double tempo, const juce::String& key,
                        std::function<void (bool, const juce::var&)> cb);
    void getSession (const juce::String& sessionId,
                     std::function<void (bool, const juce::var&)> cb);
    void joinSession (const juce::String& inviteCode,
                      std::function<void (bool, const juce::var&)> cb);

    // Collaborators
    void getCollaborators (const juce::String& sessionId,
                           std::function<void (bool, const juce::var&)> cb);

    // Comments
    void getComments (const juce::String& sessionId,
                      std::function<void (bool, const juce::var&)> cb);
    void postComment (const juce::String& sessionId, const juce::String& body,
                      const juce::String& parentId,
                      std::function<void (bool, const juce::var&)> cb);

    // Versions
    void getVersions (const juce::String& sessionId,
                      std::function<void (bool, const juce::var&)> cb);
    void createVersion (const juce::String& sessionId, const juce::String& label,
                        std::function<void (bool, const juce::var&)> cb);

    // Plugins
    void getPlugins (const juce::String& sessionId,
                     std::function<void (bool, const juce::var&)> cb);

private:
    juce::String baseUrl = "http://localhost:3000/v1";
    juce::String authToken;
    juce::ThreadPool pool { 2 };

    void makeRequest (const juce::String& method, const juce::String& endpoint,
                      const juce::var& body,
                      std::function<void (bool, const juce::var&)> cb);
};
