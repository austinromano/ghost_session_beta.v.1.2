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

    makeRequest ("POST", "/auth/login", juce::var (body), std::move (callback));
}

void LocalClient::registerUser (const juce::String& email, const juce::String& password,
                                 const juce::String& displayName,
                                 std::function<void (bool, const juce::var&)> callback)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("email", email);
    body->setProperty ("password", password);
    body->setProperty ("displayName", displayName);

    makeRequest ("POST", "/auth/register", juce::var (body), std::move (callback));
}

//==============================================================================
// Sessions
//==============================================================================
void LocalClient::getSessions (std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions", juce::var(), std::move (cb));
}

void LocalClient::createSession (const juce::String& name, const juce::String& dawType,
                                  double tempo, const juce::String& key,
                                  std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("name", name);
    body->setProperty ("dawType", dawType);
    body->setProperty ("tempo", tempo);
    body->setProperty ("key", key);

    makeRequest ("POST", "/sessions", juce::var (body), std::move (cb));
}

void LocalClient::getSession (const juce::String& sessionId,
                               std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions/" + sessionId, juce::var(), std::move (cb));
}

void LocalClient::joinSession (const juce::String& inviteCode,
                                std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("inviteCode", inviteCode);

    makeRequest ("POST", "/sessions/join", juce::var (body), std::move (cb));
}

//==============================================================================
// Collaborators
//==============================================================================
void LocalClient::getCollaborators (const juce::String& sessionId,
                                     std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions/" + sessionId + "/collaborators", juce::var(), std::move (cb));
}

//==============================================================================
// Comments
//==============================================================================
void LocalClient::getComments (const juce::String& sessionId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions/" + sessionId + "/comments", juce::var(), std::move (cb));
}

void LocalClient::postComment (const juce::String& sessionId, const juce::String& body,
                                const juce::String& parentId,
                                std::function<void (bool, const juce::var&)> cb)
{
    auto reqBody = new juce::DynamicObject();
    reqBody->setProperty ("body", body);

    if (parentId.isNotEmpty())
        reqBody->setProperty ("parentId", parentId);

    makeRequest ("POST", "/sessions/" + sessionId + "/comments", juce::var (reqBody), std::move (cb));
}

//==============================================================================
// Versions
//==============================================================================
void LocalClient::getVersions (const juce::String& sessionId,
                                std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions/" + sessionId + "/versions", juce::var(), std::move (cb));
}

void LocalClient::createVersion (const juce::String& sessionId, const juce::String& label,
                                  std::function<void (bool, const juce::var&)> cb)
{
    auto body = new juce::DynamicObject();
    body->setProperty ("label", label);

    makeRequest ("POST", "/sessions/" + sessionId + "/versions", juce::var (body), std::move (cb));
}

//==============================================================================
// Plugins
//==============================================================================
void LocalClient::getPlugins (const juce::String& sessionId,
                               std::function<void (bool, const juce::var&)> cb)
{
    makeRequest ("GET", "/sessions/" + sessionId + "/plugins", juce::var(), std::move (cb));
}

//==============================================================================
// Core request handler
//==============================================================================
void LocalClient::makeRequest (const juce::String& method, const juce::String& endpoint,
                                const juce::var& body,
                                std::function<void (bool, const juce::var&)> cb)
{
    // Capture what we need by value for the background thread
    auto urlString = baseUrl + endpoint;
    auto token = authToken;
    auto callback = std::make_shared<std::function<void (bool, const juce::var&)>> (std::move (cb));

    pool.addJob ([urlString, method, body, token, callback]()
    {
        try
        {
            juce::URL url (urlString);

            // Build the POST data string if we have a body
            juce::String postData;
            bool isPost = (method == "POST" || method == "PUT" || method == "PATCH");

            if (isPost && ! body.isVoid())
            {
                postData = juce::JSON::toString (body);
                url = url.withPOSTData (postData);
            }

            // Build headers
            juce::String extraHeaders;
            if (token.isNotEmpty())
                extraHeaders += "Authorization: Bearer " + token + "\r\n";
            if (isPost)
                extraHeaders += "Content-Type: application/json\r\n";

            // Configure the input stream options (chained — non-copyable)
            auto options = juce::URL::InputStreamOptions (isPost
                ? juce::URL::ParameterHandling::inPostData
                : juce::URL::ParameterHandling::inAddress)
                .withConnectionTimeoutMs (15000)
                .withExtraHeaders (extraHeaders);

            // Perform the request
            auto stream = url.createInputStream (options);

            if (stream == nullptr)
            {
                auto failResult = juce::var();
                juce::MessageManager::callAsync ([callback, failResult]()
                {
                    if (*callback)
                        (*callback) (false, failResult);
                });
                return;
            }

            auto responseString = stream->readEntireStreamAsString();
            auto parsed = juce::JSON::parse (responseString);
            auto statusCode = dynamic_cast<juce::WebInputStream*> (stream.get());
            bool success = true;

            if (statusCode != nullptr)
                success = (statusCode->getStatusCode() >= 200 && statusCode->getStatusCode() < 300);

            juce::MessageManager::callAsync ([callback, success, parsed]()
            {
                if (*callback)
                    (*callback) (success, parsed);
            });
        }
        catch (...)
        {
            auto failResult = juce::var();
            juce::MessageManager::callAsync ([callback, failResult]()
            {
                if (*callback)
                    (*callback) (false, failResult);
            });
        }
    });
}
