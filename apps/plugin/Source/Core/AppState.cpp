#include "AppState.h"

AppState::AppState()
{
    downloadDirectory = juce::File::getSpecialLocation(
        juce::File::userDocumentsDirectory).getChildFile("GhostSession");
    if (!downloadDirectory.exists())
        downloadDirectory.createDirectory();
}

void AppState::setAuthToken(const juce::String& token)
{
    { const juce::ScopedLock sl(lock); authToken = token; }
    listeners.call(&Listener::authStateChanged);
}

juce::String AppState::getAuthToken() const
{
    const juce::ScopedLock sl(lock);
    return authToken;
}

bool AppState::isLoggedIn() const
{
    const juce::ScopedLock sl(lock);
    return authToken.isNotEmpty();
}

void AppState::setCurrentUser(const ProducerProfile& profile)
{
    { const juce::ScopedLock sl(lock); currentUser = profile; }
    listeners.call(&Listener::appStateChanged);
}

ProducerProfile AppState::getCurrentUser() const
{
    const juce::ScopedLock sl(lock);
    return currentUser;
}

void AppState::setSessionId(const juce::String& id)
{
    const juce::ScopedLock sl(lock);
    sessionId = id;
}

juce::String AppState::getSessionId() const
{
    const juce::ScopedLock sl(lock);
    return sessionId;
}

bool AppState::isInSession() const
{
    const juce::ScopedLock sl(lock);
    return sessionId.isNotEmpty();
}

void AppState::setDownloadDirectory(const juce::File& dir)
{
    const juce::ScopedLock sl(lock);
    downloadDirectory = dir;
}

juce::File AppState::getDownloadDirectory() const
{
    const juce::ScopedLock sl(lock);
    return downloadDirectory;
}

void AppState::setServerUrl(const juce::String& url)
{
    const juce::ScopedLock sl(lock);
    serverUrl = url;
}

juce::String AppState::getServerUrl() const
{
    const juce::ScopedLock sl(lock);
    return serverUrl;
}

void AppState::setListenVolume(float v)
{
    const juce::ScopedLock sl(lock);
    listenVolume = juce::jlimit(0.0f, 1.0f, v);
}

float AppState::getListenVolume() const
{
    const juce::ScopedLock sl(lock);
    return listenVolume;
}

juce::ValueTree AppState::serialize() const
{
    const juce::ScopedLock sl(lock);
    juce::ValueTree tree("GhostState");
    tree.setProperty("authToken",    authToken, nullptr);
    tree.setProperty("downloadDir",  downloadDirectory.getFullPathName(), nullptr);
    tree.setProperty("serverUrl",    serverUrl, nullptr);
    tree.setProperty("listenVolume", listenVolume, nullptr);
    tree.setProperty("userId",       currentUser.userId, nullptr);
    tree.setProperty("displayName",  currentUser.displayName, nullptr);
    return tree;
}

void AppState::deserialize(const juce::ValueTree& tree)
{
    if (!tree.hasType("GhostState")) return;
    const juce::ScopedLock sl(lock);
    authToken       = tree.getProperty("authToken").toString();
    downloadDirectory = juce::File(tree.getProperty("downloadDir").toString());
    serverUrl       = tree.getProperty("serverUrl", "wss://api.ghostsession.io").toString();
    listenVolume    = (float)tree.getProperty("listenVolume", 0.8f);
    currentUser.userId      = tree.getProperty("userId").toString();
    currentUser.displayName = tree.getProperty("displayName").toString();
}

void AppState::addListener(Listener* l)   { listeners.add(l); }
void AppState::removeListener(Listener* l) { listeners.remove(l); }
