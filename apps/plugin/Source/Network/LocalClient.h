#pragma once

#include "JuceHeader.h"

//==============================================================================
class LocalClient
{
public:
    LocalClient();

    void setAuthToken (const juce::String& token);
    juce::String getAuthToken() const { return authToken; }
    bool isLoggedIn() const { return authToken.isNotEmpty(); }

    // Auth
    void login (const juce::String& email, const juce::String& password,
                std::function<void (bool success, const juce::var& response)> callback);
    void registerUser (const juce::String& email, const juce::String& password,
                       const juce::String& displayName,
                       std::function<void (bool success, const juce::var& response)> callback);

    // Projects
    void getProjects (std::function<void (bool, const juce::var&)> cb);
    void createProject (const juce::String& name, double tempo, const juce::String& key,
                        std::function<void (bool, const juce::var&)> cb);
    void getProject (const juce::String& projectId,
                     std::function<void (bool, const juce::var&)> cb);
    void deleteProject (const juce::String& projectId,
                        std::function<void (bool, const juce::var&)> cb);

    // Tracks
    void getTracks (const juce::String& projectId,
                    std::function<void (bool, const juce::var&)> cb);
    void addTrack (const juce::String& projectId, const juce::String& name,
                   const juce::String& type,
                   std::function<void (bool, const juce::var&)> cb);
    void deleteTrack (const juce::String& projectId, const juce::String& trackId,
                      std::function<void (bool, const juce::var&)> cb);

    // Comments
    void getComments (const juce::String& projectId,
                      std::function<void (bool, const juce::var&)> cb);
    void postComment (const juce::String& projectId, const juce::String& text,
                      const juce::String& parentId,
                      std::function<void (bool, const juce::var&)> cb);

    // Versions
    void getVersions (const juce::String& projectId,
                      std::function<void (bool, const juce::var&)> cb);
    void createVersion (const juce::String& projectId, const juce::String& name,
                        std::function<void (bool, const juce::var&)> cb);

    // Members
    void getMembers (const juce::String& projectId,
                     std::function<void (bool, const juce::var&)> cb);
    void inviteMember (const juce::String& projectId, const juce::String& email,
                       const juce::String& name, const juce::String& role,
                       std::function<void (bool, const juce::var&)> cb);

    // Sessions (uploaded files)
    void getSessions (const juce::String& projectId,
                      std::function<void (bool, const juce::var&)> cb);
    void uploadSession (const juce::String& projectId, const juce::File& file,
                        std::function<void (bool, const juce::var&)> cb);

    // Legacy aliases for existing UI code
    void getCollaborators (const juce::String& id, std::function<void (bool, const juce::var&)> cb) { getMembers(id, std::move(cb)); }
    void getPlugins (const juce::String&, std::function<void (bool, const juce::var&)> cb) { cb(true, juce::var(juce::Array<juce::var>())); }

private:
    juce::String baseUrl = "http://localhost:3000/api/v1";
    juce::String authToken;
    juce::ThreadPool pool { 2 };

    void makeRequest (const juce::String& method, const juce::String& endpoint,
                      const juce::var& body,
                      std::function<void (bool, const juce::var&)> cb);
};
