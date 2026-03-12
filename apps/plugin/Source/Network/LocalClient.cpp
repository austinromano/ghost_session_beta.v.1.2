#include "LocalClient.h"

//==============================================================================
LocalClient::LocalClient() {}

void LocalClient::setAuthToken (const juce::String& token)
{
    authToken = token;
}

//==============================================================================
// Auth
//==============================================================================
void LocalClient::login (const juce::String& email, const juce::String& password,
                          std::function<void (bool, const juce::var&)> callback)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("email", email);
    body->setProperty ("password", password);

    makeRequest ("POST", "/auth/login", juce::var (body),
        [this, callback = std::move(callback)](bool ok, const juce::var& resp)
        {
            if (ok && resp.hasProperty("data"))
            {
                auto data = resp["data"];
                authToken = data["token"].toString();
                callback(true, data);
            }
            else
            {
                callback(false, resp);
            }
        });
}

void LocalClient::registerUser (const juce::String& email, const juce::String& password,
                                 const juce::String& displayName,
                                 std::function<void (bool, const juce::var&)> callback)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("email", email);
    body->setProperty ("password", password);
    body->setProperty ("displayName", displayName);

    makeRequest ("POST", "/auth/register", juce::var (body),
        [this, callback = std::move(callback)](bool ok, const juce::var& resp)
        {
            if (ok && resp.hasProperty("data"))
            {
                auto data = resp["data"];
                authToken = data["token"].toString();
                callback(true, data);
            }
            else
            {
                callback(false, resp);
            }
        });
}

//==============================================================================
// Projects
//==============================================================================
void LocalClient::getProjects (std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects", juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::createProject (const juce::String& name, double tempo,
                                  const juce::String& key,
                                  std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("name", name);
    body->setProperty ("tempo", tempo);
    body->setProperty ("key", key);

    makeRequest ("POST", "/projects", juce::var (body),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::getProject (const juce::String& projectId,
                               std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects/" + projectId, juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::deleteProject (const juce::String& projectId,
                                  std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("DELETE", "/projects/" + projectId, juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, resp);
        });
}

//==============================================================================
// Tracks
//==============================================================================
void LocalClient::getTracks (const juce::String& projectId,
                              std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects/" + projectId + "/tracks", juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::addTrack (const juce::String& projectId, const juce::String& name,
                             const juce::String& type,
                             std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("name", name);
    body->setProperty ("type", type);

    makeRequest ("POST", "/projects/" + projectId + "/tracks", juce::var (body),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::deleteTrack (const juce::String& projectId, const juce::String& trackId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("DELETE", "/projects/" + projectId + "/tracks/" + trackId, juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, resp);
        });
}

//==============================================================================
// Comments
//==============================================================================
void LocalClient::getComments (const juce::String& projectId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects/" + projectId + "/comments", juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::postComment (const juce::String& projectId, const juce::String& text,
                                const juce::String& parentId,
                                std::function<void (bool, const juce::var&)> cb)
{
    auto reqBody = new juce::DynamicObject();
    reqBody->setProperty ("text", text);
    if (parentId.isNotEmpty())
        reqBody->setProperty ("parentId", parentId);

    makeRequest ("POST", "/projects/" + projectId + "/comments", juce::var (reqBody),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

//==============================================================================
// Versions
//==============================================================================
void LocalClient::getVersions (const juce::String& projectId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects/" + projectId + "/versions", juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::createVersion (const juce::String& projectId, const juce::String& name,
                                  std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("name", name);

    makeRequest ("POST", "/projects/" + projectId + "/versions", juce::var (body),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

//==============================================================================
// Members
//==============================================================================
void LocalClient::getMembers (const juce::String& projectId,
                               std::function<void (bool, const juce::var&)> cb)
{
    // Project detail includes members
    getProject(projectId,
        [cb = std::move(cb)](bool ok, const juce::var& project)
        {
            if (ok && project.hasProperty("members"))
                cb(true, project["members"]);
            else
                cb(ok, juce::var(juce::Array<juce::var>()));
        });
}

//==============================================================================
// Sessions (uploaded files)
//==============================================================================
void LocalClient::getSessions (const juce::String& projectId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/projects/" + projectId + "/sessions", juce::var(),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, ok ? resp["data"] : resp);
        });
}

void LocalClient::uploadSession (const juce::String& projectId, const juce::File& file,
                                  std::function<void (bool, const juce::var&)> cb)
{
    auto urlString = baseUrl + "/projects/" + projectId + "/sessions/upload";
    auto token = authToken;
    auto fileCopy = file;
    auto callback = std::make_shared<std::function<void (bool, const juce::var&)>> (std::move (cb));

    pool.addJob ([urlString, token, fileCopy, callback]()
    {
        try
        {
            juce::URL url (urlString);
            url = url.withFileToUpload ("file", fileCopy, "application/octet-stream");

            juce::String extraHeaders;
            if (token.isNotEmpty())
                extraHeaders += "Authorization: Bearer " + token + "\r\n";

            auto options = juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inPostData)
                .withConnectionTimeoutMs (60000)
                .withExtraHeaders (extraHeaders);

            auto stream = url.createInputStream (options);

            if (stream == nullptr)
            {
                juce::MessageManager::callAsync ([callback]() {
                    if (*callback) (*callback) (false, juce::var());
                });
                return;
            }

            auto responseString = stream->readEntireStreamAsString();
            auto parsed = juce::JSON::parse (responseString);
            auto* webStream = dynamic_cast<juce::WebInputStream*> (stream.get());
            bool success = true;
            if (webStream != nullptr)
                success = (webStream->getStatusCode() >= 200 && webStream->getStatusCode() < 300);

            juce::MessageManager::callAsync ([callback, success, parsed]() {
                if (*callback) (*callback) (success, parsed);
            });
        }
        catch (...)
        {
            juce::MessageManager::callAsync ([callback]() {
                if (*callback) (*callback) (false, juce::var());
            });
        }
    });
}

void LocalClient::inviteMember (const juce::String& projectId, const juce::String& email,
                                 const juce::String& name, const juce::String& role,
                                 std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    if (email.isNotEmpty())
        body->setProperty ("email", email);
    if (name.isNotEmpty())
        body->setProperty ("name", name);
    body->setProperty ("role", role.isEmpty() ? "editor" : role);

    makeRequest ("POST", "/projects/" + projectId + "/members", juce::var (body),
        [cb = std::move(cb)](bool ok, const juce::var& resp)
        {
            cb(ok, resp);
        });
}

//==============================================================================
// Core request handler
//==============================================================================
void LocalClient::makeRequest (const juce::String& method, const juce::String& endpoint,
                                const juce::var& body,
                                std::function<void (bool, const juce::var&)> cb)
{
    auto urlString = baseUrl + endpoint;
    auto token = authToken;
    auto callback = std::make_shared<std::function<void (bool, const juce::var&)>> (std::move (cb));

    pool.addJob ([urlString, method, body, token, callback]()
    {
        try
        {
            juce::URL url (urlString);

            bool isPost = (method == "POST" || method == "PUT" || method == "PATCH");
            bool isDelete = (method == "DELETE");
            bool hasBody = isPost || isDelete;

            if (isPost && ! body.isVoid())
                url = url.withPOSTData (juce::JSON::toString (body));
            else if (isDelete)
                url = url.withPOSTData ("{}");

            juce::String extraHeaders;
            if (token.isNotEmpty())
                extraHeaders += "Authorization: Bearer " + token + "\r\n";
            if (hasBody)
                extraHeaders += "Content-Type: application/json\r\n";

            auto options = juce::URL::InputStreamOptions (hasBody
                ? juce::URL::ParameterHandling::inPostData
                : juce::URL::ParameterHandling::inAddress)
                .withConnectionTimeoutMs (15000)
                .withExtraHeaders (extraHeaders)
                .withHttpRequestCmd (method);

            auto stream = url.createInputStream (options);

            if (stream == nullptr)
            {
                juce::MessageManager::callAsync ([callback]() {
                    if (*callback) (*callback) (false, juce::var());
                });
                return;
            }

            auto responseString = stream->readEntireStreamAsString();
            auto parsed = juce::JSON::parse (responseString);
            auto* webStream = dynamic_cast<juce::WebInputStream*> (stream.get());
            bool success = true;
            if (webStream != nullptr)
                success = (webStream->getStatusCode() >= 200 && webStream->getStatusCode() < 300);

            juce::MessageManager::callAsync ([callback, success, parsed]() {
                if (*callback) (*callback) (success, parsed);
            });
        }
        catch (...)
        {
            juce::MessageManager::callAsync ([callback]() {
                if (*callback) (*callback) (false, juce::var());
            });
        }
    });
}
