#pragma once
#include "JuceHeader.h"

//==============================================================================
struct GhostPluginInfo
{
    enum class Status { Loaded, Missing, Rendered };

    juce::String name;
    juce::String vendor;
    juce::String pluginId;
    Status       status = Status::Missing;

    static GhostPluginInfo fromJson(const juce::var& v)
    {
        GhostPluginInfo p;
        if (auto* obj = v.getDynamicObject())
        {
            p.name     = obj->getProperty("name").toString();
            p.vendor   = obj->getProperty("vendor").toString();
            p.pluginId = obj->getProperty("pluginId").toString();

            auto s = obj->getProperty("status").toString().toLowerCase();
            if (s == "loaded")        p.status = Status::Loaded;
            else if (s == "rendered") p.status = Status::Rendered;
            else                      p.status = Status::Missing;
        }
        return p;
    }
};

//==============================================================================
struct GhostComment
{
    juce::String id;
    juce::String authorId;
    juce::String authorName;
    juce::String body;
    juce::String parentId;
    juce::String createdAt;

    static GhostComment fromJson(const juce::var& v)
    {
        GhostComment c;
        if (auto* obj = v.getDynamicObject())
        {
            c.id         = obj->getProperty("id").toString();
            c.authorId   = obj->getProperty("authorId").toString();
            c.authorName = obj->getProperty("authorName").toString();
            c.body       = obj->getProperty("body").toString();
            c.parentId   = obj->getProperty("parentId").toString();
            c.createdAt  = obj->getProperty("createdAt").toString();
        }
        return c;
    }
};

//==============================================================================
struct GhostVersion
{
    juce::String id;
    juce::String sessionId;
    int          versionNum = 0;
    juce::String label;
    juce::String authorName;
    juce::String createdAt;

    static GhostVersion fromJson(const juce::var& v)
    {
        GhostVersion ver;
        if (auto* obj = v.getDynamicObject())
        {
            ver.id         = obj->getProperty("id").toString();
            ver.sessionId  = obj->getProperty("sessionId").toString();
            ver.versionNum = static_cast<int>(obj->getProperty("versionNum"));
            ver.label      = obj->getProperty("label").toString();
            ver.authorName = obj->getProperty("authorName").toString();
            ver.createdAt  = obj->getProperty("createdAt").toString();
        }
        return ver;
    }
};

//==============================================================================
struct GhostCollaborator
{
    juce::String userId;
    juce::String displayName;
    juce::String avatarUrl;
    juce::Colour colour;
    bool         isOnline = false;
    juce::String role;

    static GhostCollaborator fromJson(const juce::var& v)
    {
        GhostCollaborator c;
        if (auto* obj = v.getDynamicObject())
        {
            c.userId      = obj->getProperty("userId").toString();
            c.displayName = obj->getProperty("displayName").toString();
            c.avatarUrl   = obj->getProperty("avatarUrl").toString();
            c.isOnline    = static_cast<bool>(obj->getProperty("isOnline"));
            c.role        = obj->getProperty("role").toString();

            auto colourStr = obj->getProperty("colour").toString();
            if (colourStr.isNotEmpty())
                c.colour = juce::Colour::fromString(colourStr);
        }
        return c;
    }
};

//==============================================================================
struct GhostSession
{
    juce::String id;
    juce::String name;
    juce::String inviteCode;
    juce::String dawType;
    double       tempo = 120.0;
    juce::String keySignature;
    juce::String ownerId;
    juce::String ownerName;

    static GhostSession fromJson(const juce::var& v)
    {
        GhostSession s;
        if (auto* obj = v.getDynamicObject())
        {
            s.id           = obj->getProperty("id").toString();
            s.name         = obj->getProperty("name").toString();
            s.inviteCode   = obj->getProperty("inviteCode").toString();
            s.dawType      = obj->getProperty("dawType").toString();
            s.tempo        = static_cast<double>(obj->getProperty("tempo"));
            s.keySignature = obj->getProperty("keySignature").toString();
            s.ownerId      = obj->getProperty("ownerId").toString();
            s.ownerName    = obj->getProperty("ownerName").toString();
            if (s.tempo <= 0.0) s.tempo = 120.0;
        }
        return s;
    }
};
