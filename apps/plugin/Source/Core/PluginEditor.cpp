#include "PluginEditor.h"

GhostSessionEditor::GhostSessionEditor(GhostSessionProcessor& p)
    : AudioProcessorEditor(&p), proc(p)
{
    setLookAndFeel(&theme);

    // --- Login panel ---
    loginPanel.onLogin = [this](const juce::String& email, const juce::String& password) {
        loginPanel.setLoading(true);
        loginPanel.setError({});
        proc.getClient().login(email, password,
            [this](bool success, const juce::var& resp) {
                juce::MessageManager::callAsync([this, success, resp]() {
                    loginPanel.setLoading(false);
                    if (success)
                        onLoginSuccess();
                    else
                    {
                        auto msg = resp.isObject() ? resp["message"].toString() : juce::String("Login failed");
                        loginPanel.setError(msg.isEmpty() ? "Login failed" : msg);
                    }
                });
            });
    };

    loginPanel.onRegister = [this](const juce::String& email, const juce::String& password, const juce::String& name) {
        loginPanel.setLoading(true);
        loginPanel.setError({});
        proc.getClient().registerUser(email, password, name,
            [this](bool success, const juce::var& resp) {
                juce::MessageManager::callAsync([this, success, resp]() {
                    loginPanel.setLoading(false);
                    if (success)
                        onLoginSuccess();
                    else
                    {
                        auto msg = resp.isObject() ? resp["message"].toString() : juce::String("Registration failed");
                        loginPanel.setError(msg.isEmpty() ? "Registration failed" : msg);
                    }
                });
            });
    };
    addAndMakeVisible(loginPanel);

    // --- Project list (left sidebar) ---
    projectList.onProjectSelected = [this](const ProjectListPanel::ProjectItem& item) {
        openProject(item.id, item.name);
    };

    projectList.onCreateClicked = [this] {
        proc.getClient().createProject("New Project", 140.0, "C",
            [this](bool ok, const juce::var&) {
                if (ok) juce::MessageManager::callAsync([this]() { fetchProjects(); });
            });
    };

    projectList.onDeleteProject = [this](const ProjectListPanel::ProjectItem& item) {
        proc.getClient().deleteProject(item.id,
            [this, deletedId = item.id](bool ok, const juce::var&) {
                if (!ok) return;
                juce::MessageManager::callAsync([this, deletedId]() {
                    // Clear current view if we deleted the active project
                    if (currentProjectId == deletedId)
                    {
                        projectView = nullptr;
                        currentProjectId = {};
                        currentProjectName = {};
                        repaint();
                    }
                    // Remove from file map
                    projectFileMap.erase(deletedId);
                    saveFileMap();
                    fetchProjects();
                });
            });
    };
    addChildComponent(projectList);

    // --- Invite popup ---
    invitePopup.onInvite = [this](const juce::String& email, const juce::String& name, const juce::String& role) {
        if (currentProjectId.isEmpty()) return;
        proc.getClient().inviteMember(currentProjectId, email, name, role,
            [this](bool ok, const juce::var& resp) {
                juce::MessageManager::callAsync([this, ok, resp]() {
                    if (ok)
                        invitePopup.setSuccess("Invited!");
                    else
                    {
                        auto msg = resp.isObject() ? resp["error"].toString() : juce::String("Invite failed");
                        invitePopup.setError(msg.isEmpty() ? "Invite failed" : msg);
                    }
                });
            });
    };
    addChildComponent(invitePopup);

    setResizable(true, true);
    setResizeLimits(900, 500, 1920, 1200);
    setSize(1100, 720);

    loadFileMap();

    if (proc.getClient().isLoggedIn())
        onLoginSuccess();
    else
        showLoginView();
}

GhostSessionEditor::~GhostSessionEditor()
{
    saveFileMap();
    stopTimer();
    setLookAndFeel(nullptr);
}

void GhostSessionEditor::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);

    // Empty state when no project is selected
    if (loggedIn && !projectView)
    {
        auto area = getLocalBounds().withLeft(kSidebarW);
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(16.0f, juce::Font::italic));
        g.drawText("Select a project or create a new one",
                   area, juce::Justification::centred);
    }
}

void GhostSessionEditor::resized()
{
    auto bounds = getLocalBounds();

    if (!loggedIn)
    {
        loginPanel.setBounds(bounds);
        return;
    }

    projectList.setBounds(bounds.removeFromLeft(kSidebarW));

    if (projectView)
        projectView->setBounds(bounds);

    // Invite popup
    int popupW = 300, popupH = 200;
    invitePopup.setBounds(getWidth() - popupW - 16, 56, popupW, popupH);
}

void GhostSessionEditor::timerCallback()
{
    // Periodic refresh of project data
    if (currentProjectId.isNotEmpty())
        fetchProjectTracks();
}

void GhostSessionEditor::showLoginView()
{
    loggedIn = false;
    loginPanel.setVisible(true);
    projectList.setVisible(false);
    projectView = nullptr;
    resized();
}

void GhostSessionEditor::showMainView()
{
    loggedIn = true;
    loginPanel.setVisible(false);
    projectList.setVisible(true);
    resized();
}

void GhostSessionEditor::onLoginSuccess()
{
    showMainView();
    fetchProjects();
    startTimer(10000);
}

void GhostSessionEditor::fetchProjects()
{
    proc.getClient().getProjects([this](bool ok, const juce::var& data) {
        if (!ok || !data.isArray()) return;

        juce::MessageManager::callAsync([this, data]() {
            std::vector<ProjectListPanel::ProjectItem> items;
            for (int i = 0; i < data.size(); ++i)
            {
                auto p = data[i];
                ProjectListPanel::ProjectItem item;
                item.id = p["id"].toString();
                item.name = p["name"].toString();
                item.tempo = static_cast<double>(p["tempo"]);
                item.key = p["key"].toString();
                if (item.tempo <= 0) item.tempo = 140.0;
                if (item.key.isEmpty()) item.key = "C";
                items.push_back(item);
            }
            projectList.setProjects(items);

            // Auto-select first project if none selected
            if (currentProjectId.isEmpty() && !items.empty())
            {
                projectList.setSelectedId(items[0].id);
                openProject(items[0].id, items[0].name);
            }
        });
    });
}

void GhostSessionEditor::openProject(const juce::String& id, const juce::String& name)
{
    currentProjectId = id;
    currentProjectName = name;

    // Create fresh project view, restoring any saved local file mappings
    projectView = std::make_unique<ProjectView>(proc);
    addAndMakeVisible(*projectView);
    projectView->setProjectName(name);

    // Restore persisted local file map for this project
    auto it = projectFileMap.find(id);
    if (it != projectFileMap.end())
    {
        projectView->setLocalFileMap(it->second);

        // Restore bounce file if saved
        auto bounceIt = it->second.find("__bounce__");
        if (bounceIt != it->second.end() && bounceIt->second.existsAsFile())
            projectView->setBounceFile(bounceIt->second);
    }

    // Wire up callbacks
    projectView->onInviteClicked = [this] {
        bool show = !invitePopup.isVisible();
        invitePopup.setVisible(show);
        if (show)
        {
            invitePopup.reset();
            invitePopup.toFront(true);
        }
    };

    projectView->onFileDropped = [this](const juce::File& file, const juce::String& ext) {
        // Persist the local file mapping for this project
        auto stemName = file.getFileNameWithoutExtension().toLowerCase();
        projectFileMap[currentProjectId][stemName] = file;
        saveFileMap();
        handleFileDrop(file, ext);
    };

    projectView->onBounceSet = [this](const juce::File& file) {
        projectFileMap[currentProjectId]["__bounce__"] = file;
        saveFileMap();
    };

    projectView->onBounceCleared = [this] {
        projectFileMap[currentProjectId].erase("__bounce__");
        saveFileMap();
    };

    projectView->onDeleteStem = [this](const juce::String& trackId) {
        if (currentProjectId.isEmpty()) return;
        proc.getClient().deleteTrack(currentProjectId, trackId,
            [this](bool ok, const juce::var&) {
                if (ok) juce::MessageManager::callAsync([this]() { fetchProjectTracks(); });
            });
    };

    // Chat send
    projectView->getChat().onSendMessage = [this](const juce::String& text) {
        proc.getSessionManager().sendChatMessage(text);
        auto user = proc.getAppState().getCurrentUser();
        projectView->getChat().addMessage(
            user.displayName.isEmpty() ? "You" : user.displayName,
            text, GhostColours::ghostGreen);
    };

    resized();
    fetchProjectTracks();
}

void GhostSessionEditor::fetchProjectTracks()
{
    if (currentProjectId.isEmpty() || !projectView) return;

    proc.getClient().getTracks(currentProjectId,
        [this](bool ok, const juce::var& data) {
            if (!ok || !data.isArray()) return;

            juce::MessageManager::callAsync([this, data]() {
                if (!projectView) return;

                std::vector<StemRow::StemInfo> stems;
                for (int i = 0; i < data.size(); ++i)
                {
                    auto item = data[i];
                    StemRow::StemInfo stem;
                    stem.id = item["id"].toString();
                    stem.name = item["name"].toString();
                    stem.ownerName = item["ownerName"].toString();
                    stem.type = item["type"].toString();
                    stem.muted = static_cast<bool>(item["muted"]);
                    stem.soloed = static_cast<bool>(item["soloed"]);

                    auto vol = item["volume"];
                    stem.volume = vol.isVoid() ? 0.8f : static_cast<float>(static_cast<double>(vol));

                    if (stem.type.isEmpty()) stem.type = "audio";
                    stems.push_back(stem);
                }
                projectView->setStems(stems);
            });
        });

    // Update tempo/key labels
    proc.getClient().getProject(currentProjectId,
        [this](bool ok, const juce::var& data) {
            if (!ok) return;
            juce::MessageManager::callAsync([this, data]() {
                if (!projectView) return;
                auto tempo = static_cast<double>(data["tempo"]);
                auto key = data["key"].toString();
                projectView->setProjectName(
                    currentProjectName + "   " +
                    juce::String(tempo > 0 ? tempo : 140.0, 0) + " BPM  |  " +
                    (key.isEmpty() ? "C" : key));
            });
        });
}

void GhostSessionEditor::handleFileDrop(const juce::File& file, const juce::String& ext)
{
    if (currentProjectId.isEmpty()) return;

    // Upload the file as a session file
    proc.getClient().uploadSession(currentProjectId, file,
        [this](bool ok, const juce::var&) {
            if (!ok) return;
            juce::MessageManager::callAsync([this]() {
                fetchProjectTracks();
            });
        });

    // Also create a track entry
    juce::String type = "audio";
    if (ext == ".mid" || ext == ".midi") type = "midi";

    proc.getClient().addTrack(currentProjectId, file.getFileNameWithoutExtension(), type,
        [this](bool ok, const juce::var&) {
            if (ok) juce::MessageManager::callAsync([this]() { fetchProjectTracks(); });
        });
}

juce::File GhostSessionEditor::getFileMapPath()
{
    auto dir = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                   .getChildFile("GhostSession");
    dir.createDirectory();
    return dir.getChildFile("file_map.json");
}

void GhostSessionEditor::saveFileMap()
{
    auto root = std::make_unique<juce::DynamicObject>();
    for (auto& [projId, fileMap] : projectFileMap)
    {
        auto projObj = std::make_unique<juce::DynamicObject>();
        for (auto& [stemName, file] : fileMap)
        {
            if (file.existsAsFile())
                projObj->setProperty(stemName, file.getFullPathName());
        }
        root->setProperty(projId, projObj.release());
    }

    auto json = juce::JSON::toString(juce::var(root.release()));
    getFileMapPath().replaceWithText(json);
}

void GhostSessionEditor::loadFileMap()
{
    auto mapFile = getFileMapPath();
    if (!mapFile.existsAsFile()) return;

    auto json = juce::JSON::parse(mapFile.loadFileAsString());
    if (!json.isObject()) return;

    if (auto* obj = json.getDynamicObject())
    {
        for (auto& prop : obj->getProperties())
        {
            auto projId = prop.name.toString();
            if (auto* projObj = prop.value.getDynamicObject())
            {
                for (auto& stemProp : projObj->getProperties())
                {
                    auto stemName = stemProp.name.toString();
                    auto filePath = stemProp.value.toString();
                    juce::File f(filePath);
                    if (f.existsAsFile())
                        projectFileMap[projId][stemName] = f;
                }
            }
        }
    }
}
