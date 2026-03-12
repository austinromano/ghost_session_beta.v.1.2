#include "PluginEditor.h"

GhostSessionEditor::GhostSessionEditor(GhostSessionProcessor& p)
    : AudioProcessorEditor(&p), proc(p)
{
    setLookAndFeel(&theme);

    // Sidebar tab switching
    sidebar.onTabChanged = [this](Sidebar::Tab tab) {
        dashboard.showTab(tab);
    };
    addAndMakeVisible(sidebar);
    addAndMakeVisible(headerBar);
    addAndMakeVisible(dashboard);

    // Comment posting
    dashboard.getComments().onPostComment = [this](const juce::String& body, const juce::String& parentId) {
        if (currentSessionId.isEmpty()) return;
        proc.getClient().postComment(currentSessionId, body, parentId,
            [this](bool, const juce::var&) { fetchSessionData(); });
    };

    setResizable(true, true);
    setResizeLimits(800, 500, 1920, 1200);
    setSize(1100, 720);

    // Auto-login then fetch data
    autoLogin();

    // Poll for updates every 5 seconds
    startTimerHz(0); // will start after login
}

GhostSessionEditor::~GhostSessionEditor()
{
    stopTimer();
    setLookAndFeel(nullptr);
}

void GhostSessionEditor::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);
}

void GhostSessionEditor::resized()
{
    auto bounds = getLocalBounds();
    sidebar.setBounds(bounds.removeFromLeft(kSidebarWidth));
    headerBar.setBounds(bounds.removeFromTop(kHeaderHeight));
    dashboard.setBounds(bounds);
}

void GhostSessionEditor::timerCallback()
{
    if (currentSessionId.isNotEmpty())
        fetchSessionData();
}

void GhostSessionEditor::autoLogin()
{
    auto username = juce::SystemStats::getLogonName();
    proc.getClient().login(username + "@ghost.local", "ghost",
        [this](bool success, const juce::var& resp) {
            if (!success)
            {
                // Try register
                auto username = juce::SystemStats::getLogonName();
                proc.getClient().registerUser(username + "@ghost.local", "ghost", username,
                    [this](bool regSuccess, const juce::var& regResp) {
                        if (regSuccess)
                        {
                            proc.getClient().setAuthToken(regResp["token"].toString());
                            fetchSessionData();
                            startTimer(5000);
                        }
                    });
                return;
            }
            proc.getClient().setAuthToken(resp["token"].toString());

            // Get sessions list, use first one or create one
            proc.getClient().getSessions([this](bool ok, const juce::var& sessions) {
                if (ok && sessions.isArray() && sessions.size() > 0)
                {
                    auto first = sessions[0];
                    currentSessionId = first["id"].toString();
                    headerBar.setSessionName(first["name"].toString());
                    headerBar.setInviteCode(first["inviteCode"].toString());
                    fetchSessionData();
                    startTimer(5000);
                }
                else
                {
                    // Join demo session or create one
                    proc.getClient().joinSession("LUNAR1",
                        [this](bool joinOk, const juce::var& joinResp) {
                            if (joinOk)
                            {
                                currentSessionId = joinResp["sessionId"].toString();
                                headerBar.setSessionName(joinResp["name"].toString());
                                fetchSessionData();
                            }
                            startTimer(5000);
                        });
                }
            });
        });
}

void GhostSessionEditor::fetchSessionData()
{
    if (currentSessionId.isEmpty()) return;

    // Fetch comments
    proc.getClient().getComments(currentSessionId,
        [this](bool ok, const juce::var& data) {
            if (!ok || !data.isArray()) return;
            std::vector<GhostComment> comments;
            for (int i = 0; i < data.size(); ++i)
                comments.push_back(GhostComment::fromJson(data[i]));
            dashboard.getComments().setComments(comments);
        });

    // Fetch versions
    proc.getClient().getVersions(currentSessionId,
        [this](bool ok, const juce::var& data) {
            if (!ok || !data.isArray()) return;
            std::vector<GhostVersion> versions;
            for (int i = 0; i < data.size(); ++i)
                versions.push_back(GhostVersion::fromJson(data[i]));
            dashboard.getVersions().setVersions(versions);
        });

    // Fetch collaborators
    proc.getClient().getCollaborators(currentSessionId,
        [this](bool ok, const juce::var& data) {
            if (!ok || !data.isArray()) return;
            std::vector<GhostCollaborator> collabs;
            for (int i = 0; i < data.size(); ++i)
                collabs.push_back(GhostCollaborator::fromJson(data[i]));
            dashboard.getCollaborators().setCollaborators(collabs);
        });

    // Fetch plugins
    proc.getClient().getPlugins(currentSessionId,
        [this](bool ok, const juce::var& data) {
            if (!ok || !data.isArray()) return;
            std::vector<GhostPluginInfo> plugins;
            int editable = 0, missing = 0, rendered = 0;
            for (int i = 0; i < data.size(); ++i)
            {
                auto p = GhostPluginInfo::fromJson(data[i]);
                plugins.push_back(p);
                switch (p.status)
                {
                    case GhostPluginInfo::Status::Loaded:   editable++; break;
                    case GhostPluginInfo::Status::Missing:  missing++; break;
                    case GhostPluginInfo::Status::Rendered: rendered++; break;
                }
            }
            dashboard.getPluginStatus().setPlugins(plugins);
            dashboard.getTrackStatus().setStatus(editable, missing, rendered);
        });
}
