#include "ApiClient.h"

ApiClient::ApiClient(AppState& state) : appState(state) {}

void ApiClient::createSession(const juce::var& data, Callback cb)
{
    makeRequest("POST", "/sessions", data, std::move(cb));
}

void ApiClient::joinSession(const juce::var& data, Callback cb)
{
    makeRequest("POST", "/sessions/join", data, std::move(cb));
}

void ApiClient::endSession(const juce::String& sessionId, Callback cb)
{
    makeRequest("DELETE", "/sessions/" + sessionId, {}, std::move(cb));
}

void ApiClient::inviteToSession(const juce::var& data, Callback cb)
{
    makeRequest("POST", "/sessions/invite", data, std::move(cb));
}

void ApiClient::uploadFile(const juce::File& file, const juce::var& metadata,
                            std::function<void(float)> progress, Callback cb)
{
    pool.addJob([this, file, metadata, progress = std::move(progress),
                 cb = std::move(cb)]() mutable
    {
        Response resp;

        try
        {
            juce::URL url(baseUrl + "/files/upload");
            url = url.withFileToUpload("file", file, "application/octet-stream");

            auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
                .withExtraHeaders("Authorization: Bearer " + appState.getAuthToken())
                .withConnectionTimeoutMs(60000);

            if (auto stream = url.createInputStream(options))
            {
                resp.statusCode = 200;
                resp.body = juce::JSON::parse(stream->readEntireStreamAsString());
            }
            else
            {
                resp.error = "Upload failed";
            }
        }
        catch (...)
        {
            resp.error = "Upload error";
        }

        juce::MessageManager::callAsync([cb = std::move(cb), resp]() {
            if (cb) cb(resp);
        });
    });
}

void ApiClient::getDownloadUrl(const juce::String& fileId, Callback cb)
{
    makeRequest("GET", "/files/" + fileId + "/download", {}, std::move(cb));
}

void ApiClient::login(const juce::String& email, const juce::String& password, Callback cb)
{
    auto* body = new juce::DynamicObject();
    body->setProperty("email", email);
    body->setProperty("password", password);
    makeRequest("POST", "/auth/login", juce::var(body), std::move(cb));
}

void ApiClient::registerUser(const juce::String& email, const juce::String& password,
                              const juce::String& displayName, Callback cb)
{
    auto* body = new juce::DynamicObject();
    body->setProperty("email", email);
    body->setProperty("password", password);
    body->setProperty("displayName", displayName);
    makeRequest("POST", "/auth/register", juce::var(body), std::move(cb));
}

void ApiClient::makeRequest(const juce::String& method, const juce::String& endpoint,
                             const juce::var& body, Callback cb)
{
    pool.addJob([this, method, endpoint, body, cb = std::move(cb)]() mutable
    {
        Response resp;

        try
        {
            juce::String fullUrl = baseUrl + endpoint;
            bool isPost = (method == "POST" || method == "PUT" || method == "DELETE");

            if (isPost && !body.isVoid())
            {
                // For POST with JSON body, use withPOSTData
                juce::URL url(fullUrl);
                auto jsonStr = juce::JSON::toString(body);

                url = url.withPOSTData(jsonStr);

                juce::String headers = "Content-Type: application/json";
                auto token = appState.getAuthToken();
                if (token.isNotEmpty())
                    headers += "\r\nAuthorization: Bearer " + token;

                auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
                    .withExtraHeaders(headers)
                    .withConnectionTimeoutMs(15000);

                if (auto stream = url.createInputStream(options))
                {
                    auto responseStr = stream->readEntireStreamAsString();
                    DBG("[API] " + method + " " + endpoint + " -> " + responseStr.substring(0, 200));
                    resp.statusCode = 200;
                    resp.body = juce::JSON::parse(responseStr);
                }
                else
                {
                    DBG("[API] " + method + " " + endpoint + " -> Connection failed");
                    resp.error = "Connection failed — is the server running?";
                }
            }
            else
            {
                // GET request
                juce::URL url(fullUrl);

                juce::String headers;
                auto token = appState.getAuthToken();
                if (token.isNotEmpty())
                    headers = "Authorization: Bearer " + token;

                auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
                    .withExtraHeaders(headers)
                    .withConnectionTimeoutMs(15000);

                if (auto stream = url.createInputStream(options))
                {
                    auto responseStr = stream->readEntireStreamAsString();
                    DBG("[API] " + method + " " + endpoint + " -> " + responseStr.substring(0, 200));
                    resp.statusCode = 200;
                    resp.body = juce::JSON::parse(responseStr);
                }
                else
                {
                    DBG("[API] " + method + " " + endpoint + " -> Connection failed");
                    resp.error = "Connection failed — is the server running?";
                }
            }
        }
        catch (...)
        {
            DBG("[API] " + method + " " + endpoint + " -> EXCEPTION");
            resp.error = "Request failed";
        }

        juce::MessageManager::callAsync([cb = std::move(cb), resp]() {
            if (cb) cb(resp);
        });
    });
}
