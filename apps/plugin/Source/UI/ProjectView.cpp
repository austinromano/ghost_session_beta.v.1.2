#include "ProjectView.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"
#include <set>

//==============================================================================
// StemRow
//==============================================================================
StemRow::StemRow()
{
    playBtn.onClick = [this] {
        if (onPlayClicked) onPlayClicked(stem.id);
    };
    addAndMakeVisible(playBtn);

    muteBtn.setClickingTogglesState(true);
    muteBtn.onClick = [this] {
        if (onMuteToggle) onMuteToggle(stem.id, muteBtn.getToggleState());
    };
    addAndMakeVisible(muteBtn);

    soloBtn.setClickingTogglesState(true);
    soloBtn.onClick = [this] {
        if (onSoloToggle) onSoloToggle(stem.id, soloBtn.getToggleState());
    };
    addAndMakeVisible(soloBtn);

    deleteBtn.onClick = [this] {
        if (onDeleteClicked) onDeleteClicked(stem.id);
    };
    addAndMakeVisible(deleteBtn);

    addAndMakeVisible(waveform);
}

void StemRow::setStem(const StemInfo& info)
{
    auto previousFile = stem.localFile;
    stem = info;
    muteBtn.setToggleState(info.muted, juce::dontSendNotification);
    soloBtn.setToggleState(info.soloed, juce::dontSendNotification);

    if (info.localFile.existsAsFile() && info.localFile != previousFile)
    {
        waveform.setAudioFile(info.localFile);
        waveform.setDraggableFile(info.localFile);
    }

    repaint();
}

void StemRow::setPlayingState(bool playing)
{
    isCurrentlyPlaying = playing;
    playBtn.setButtonText(playing ? "||" : ">");
    repaint();
}

void StemRow::setPlaybackPosition(double pos)
{
    waveform.setPlaybackPosition(pos);
}

void StemRow::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat().reduced(2.0f, 1.0f);

    // Background
    g.setColour(isCurrentlyPlaying ? GhostColours::surfaceLight : GhostColours::surface);
    g.fillRoundedRectangle(bounds, 4.0f);

    // Type colour strip
    juce::Colour typeCol = GhostColours::audioTrack;
    auto t = stem.type.toLowerCase();
    if (t == "midi")      typeCol = GhostColours::midiTrack;
    else if (t == "drum") typeCol = GhostColours::drumTrack;
    else if (t == "loop") typeCol = GhostColours::loopTrack;

    g.setColour(typeCol);
    g.fillRoundedRectangle(bounds.getX(), bounds.getY(), 4.0f, bounds.getHeight(), 2.0f);

    // Playing indicator
    if (isCurrentlyPlaying)
    {
        g.setColour(GhostColours::ghostGreen);
        g.fillEllipse(40.0f, bounds.getCentreY() - 3.0f, 6.0f, 6.0f);
    }

    // Track name
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(12.0f, juce::Font::bold));
    g.drawText(stem.name, 52, 8, 100, 16, juce::Justification::centredLeft);

    // Owner + type
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::plain));
    juce::String meta;
    if (stem.ownerName.isNotEmpty()) meta = "@" + stem.ownerName + "  ";
    meta += stem.type.toUpperCase();
    g.drawText(meta, 52, 26, 100, 12, juce::Justification::centredLeft);

    // "No audio" indicator if no local file
    if (!stem.localFile.existsAsFile())
    {
        auto waveArea = waveform.getBounds().toFloat();
        g.setColour(GhostColours::textMuted.withAlpha(0.5f));
        g.setFont(juce::Font(10.0f, juce::Font::italic));
        g.drawText("No audio file", waveArea.toNearestInt(), juce::Justification::centred);
    }
}

void StemRow::resized()
{
    auto bounds = getLocalBounds();

    // Play button on the left
    playBtn.setBounds(8, bounds.getCentreY() - 12, 26, 24);

    // Delete button on far right
    deleteBtn.setBounds(bounds.getRight() - 26, bounds.getCentreY() - 10, 22, 20);

    // M/S buttons next to delete
    auto btnArea = bounds.removeFromRight(82);
    muteBtn.setBounds(btnArea.removeFromLeft(28).reduced(2, 14));
    soloBtn.setBounds(btnArea.removeFromLeft(28).reduced(2, 14));

    // Track info area
    bounds.removeFromLeft(160);

    // Waveform takes remaining space
    waveform.setBounds(bounds.reduced(4, 6));
}

void StemRow::mouseDown(const juce::MouseEvent&)
{
    dragging = false;
}

void StemRow::mouseDrag(const juce::MouseEvent& e)
{
    if (dragging) return;
    if (!stem.localFile.existsAsFile()) return;

    // Only start drag after moving a few pixels
    if (e.getDistanceFromDragStart() < 5) return;

    dragging = true;
    juce::StringArray files;
    files.add(stem.localFile.getFullPathName());
    juce::DragAndDropContainer::performExternalDragDropOfFiles(files, false);
}

//==============================================================================
// ChatPanel
//==============================================================================
ChatPanel::ChatPanel()
{
    inputField.setTextToShowWhenEmpty("Message...", GhostColours::textMuted);
    inputField.onReturnKey = [this] { sendCurrent(); };
    addAndMakeVisible(inputField);

    sendButton.onClick = [this] { sendCurrent(); };
    addAndMakeVisible(sendButton);
}

void ChatPanel::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();

    g.setColour(GhostColours::surface);
    g.fillRect(bounds);

    // Left border
    g.setColour(GhostColours::border);
    g.drawLine(0.5f, 0, 0.5f, bounds.getHeight(), 1.0f);

    // Header
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("CHAT", 12, 8, (int)bounds.getWidth() - 24, 14,
               juce::Justification::centredLeft);

    // Messages
    int y = 28;
    int maxY = getHeight() - 44;
    int startIdx = 0;

    int totalH = (int)messages.size() * 32;
    if (totalH > (maxY - 28))
        startIdx = juce::jmax(0, (int)messages.size() - ((maxY - 28) / 32));

    for (int i = startIdx; i < (int)messages.size(); ++i)
    {
        if (y > maxY) break;
        auto& m = messages[(size_t)i];

        g.setColour(m.colour);
        g.setFont(juce::Font(10.0f, juce::Font::bold));
        g.drawText(m.user, 12, y, (int)bounds.getWidth() - 24, 12,
                   juce::Justification::centredLeft);

        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(11.0f, juce::Font::plain));
        g.drawText(m.text, 12, y + 12, (int)bounds.getWidth() - 24, 16,
                   juce::Justification::centredLeft);
        y += 32;
    }

    if (messages.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(11.0f, juce::Font::italic));
        g.drawText("No messages yet",
                   getLocalBounds().withTop(28).withBottom(maxY),
                   juce::Justification::centred);
    }
}

void ChatPanel::resized()
{
    auto bounds = getLocalBounds().reduced(8);
    auto inputArea = bounds.removeFromBottom(32);
    sendButton.setBounds(inputArea.removeFromRight(36).reduced(2));
    inputField.setBounds(inputArea.reduced(2));
}

void ChatPanel::addMessage(const juce::String& user, const juce::String& text,
                            juce::Colour colour)
{
    messages.push_back({ user, text, colour });
    repaint();
}

void ChatPanel::clear() { messages.clear(); repaint(); }

void ChatPanel::sendCurrent()
{
    auto text = inputField.getText().trim();
    if (text.isEmpty()) return;
    if (onSendMessage) onSendMessage(text);
    inputField.clear();
}

//==============================================================================
// ProjectView
//==============================================================================
ProjectView::ProjectView(GhostSessionProcessor& processor)
    : proc(processor)
{
    // Upload button opens file chooser
    uploadButton.onClick = [this] {
        fileChooser = std::make_unique<juce::FileChooser>(
            "Upload Files",
            juce::File::getSpecialLocation(juce::File::userHomeDirectory),
            "*.wav;*.flac;*.mp3;*.aiff;*.mid;*.midi;*.als;*.flp;*.rpp;*");

        fileChooser->launchAsync(
            juce::FileBrowserComponent::openMode |
            juce::FileBrowserComponent::canSelectFiles |
            juce::FileBrowserComponent::canSelectMultipleItems,
            [this](const juce::FileChooser& fc) {
                GhostLog::write("[ProjectView] FileChooser returned " + juce::String(fc.getResults().size()) + " files");
                for (auto& file : fc.getResults())
                {
                    if (!file.existsAsFile()) continue;
                    addStemFromFile(file);
                    if (onFileDropped)
                        onFileDropped(file, file.getFileExtension().toLowerCase());
                }
            });
    };
    addAndMakeVisible(uploadButton);

    inviteButton.onClick = [this] { if (onInviteClicked) onInviteClicked(); };
    addAndMakeVisible(inviteButton);

    addFileButton.onClick = [this] { uploadButton.triggerClick(); };
    addAndMakeVisible(addFileButton);

    // Bounce waveform + play
    bounceWaveform.setInteractive(true);
    bounceWaveform.onScrub = [this](double pos) {
        // Could seek playback here in the future
    };
    addAndMakeVisible(bounceWaveform);

    bouncePlayBtn.onClick = [this] { playBounce(); };
    addAndMakeVisible(bouncePlayBtn);

    bounceDeleteBtn.onClick = [this] {
        if (proc.isPlaying() && currentPlayingStemId.isEmpty())
            stopAll();
        bounceFile = {};
        hasBounce = false;
        bounceWaveform.setAudioFile({});
        if (onBounceCleared) onBounceCleared();
        resized();
        repaint();
    };
    addChildComponent(bounceDeleteBtn);

    // Stems viewport
    stemsViewport.setViewedComponent(&stemsContainer, false);
    stemsViewport.setScrollBarsShown(true, false);
    addAndMakeVisible(stemsViewport);

    // Chat
    addAndMakeVisible(chatPanel);

    // Transport
    playBtn.onClick = [this] {
        if (proc.isPlaying())
            stopAll();
        else if (hasBounce)
            playBounce();
        else if (!stemRows.empty() && stemRows[0]->getStem().localFile.existsAsFile())
            playStem(stemRows[0]->getStem().id);
    };
    addAndMakeVisible(playBtn);

    stopBtn.onClick = [this] { stopAll(); };
    addAndMakeVisible(stopBtn);

    posLabel.setFont(juce::Font(juce::Font::getDefaultMonospacedFontName(), 12.0f, juce::Font::bold));
    posLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    posLabel.setText("0:00 / 0:00", juce::dontSendNotification);
    addAndMakeVisible(posLabel);

    infoLabel.setFont(juce::Font(11.0f, juce::Font::bold));
    infoLabel.setColour(juce::Label::textColourId, GhostColours::textMuted);
    addAndMakeVisible(infoLabel);

    volumeSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    volumeSlider.setRange(0.0, 1.0, 0.01);
    volumeSlider.setValue(0.8);
    volumeSlider.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);
    addAndMakeVisible(volumeSlider);

    // Timer for playback position updates
    startTimerHz(30);
}

ProjectView::~ProjectView()
{
    stopTimer();
}

void ProjectView::timerCallback()
{
    if (!proc.isPlaying()) return;

    double pos = proc.getPlaybackPosition();

    // Update transport display
    double currentSec = pos * proc.getPlaybackLengthSeconds();
    double totalSec = proc.getPlaybackLengthSeconds();
    posLabel.setText(formatTime(currentSec) + " / " + formatTime(totalSec),
                     juce::dontSendNotification);

    playBtn.setButtonText("||");

    // Update bounce waveform position
    if (hasBounce && currentPlayingStemId.isEmpty())
        bounceWaveform.setPlaybackPosition(pos);

    // Update playing stem waveform
    for (auto& row : stemRows)
    {
        bool isThis = (row->getStem().id == currentPlayingStemId);
        row->setPlayingState(isThis);
        if (isThis)
            row->setPlaybackPosition(pos);
    }

    // Check if playback finished
    if (pos >= 1.0)
    {
        stopAll();
    }
}

void ProjectView::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);

    int contentW = getWidth() - kChatW;

    // Header
    g.setColour(GhostColours::surface);
    g.fillRect(0, 0, contentW, kHeaderH);
    g.setColour(GhostColours::border);
    g.drawLine(0, (float)kHeaderH - 0.5f, (float)contentW, (float)kHeaderH - 0.5f, 1.0f);

    // Project name
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(18.0f, juce::Font::bold));
    g.drawText(projectName, 16, 0, contentW - 200, kHeaderH,
               juce::Justification::centredLeft);

    // Full Mix label
    int bodyY = kHeaderH + 8;
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("FULL MIX", 44, bodyY, 200, 14, juce::Justification::centredLeft);

    if (!hasBounce)
    {
        auto bounceArea = juce::Rectangle<float>(12.0f, (float)bodyY + 18, (float)contentW - 24.0f, (float)kBounceH);
        g.setColour(GhostColours::waveformBg);
        g.fillRoundedRectangle(bounceArea, 4.0f);
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(11.0f, juce::Font::italic));
        g.drawText("Drop a bounce file here to see the full mix waveform",
                   bounceArea.toNearestInt(), juce::Justification::centred);
    }

    // Stems label
    int stemsLabelY = bodyY + 18 + kBounceH + 8;
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("STEMS (" + juce::String((int)stemRows.size()) + ")",
               16, stemsLabelY, 200, 14, juce::Justification::centredLeft);

    // Drop zone
    int dropY = getHeight() - kTransportH - kDropZoneH;
    auto dropBounds = juce::Rectangle<float>(12.0f, (float)dropY, (float)contentW - 24.0f, (float)kDropZoneH - 4.0f);

    if (isDragOver)
    {
        g.setColour(GhostColours::ghostGreen.withAlpha(0.1f));
        g.fillRoundedRectangle(dropBounds, 6.0f);
        g.setColour(GhostColours::ghostGreen);
        g.drawRoundedRectangle(dropBounds, 6.0f, 2.0f);
        g.setFont(juce::Font(13.0f, juce::Font::bold));
        g.drawText("Drop to add files", dropBounds.toNearestInt(), juce::Justification::centred);
    }
    else
    {
        g.setColour(GhostColours::border);
        g.drawRoundedRectangle(dropBounds, 6.0f, 1.0f);
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(11.0f, juce::Font::plain));
        g.drawText("Drag stems, bounces, or session files here",
                   dropBounds.toNearestInt().reduced(0, 8), juce::Justification::centred);
    }

    // Transport bar
    int transportY = getHeight() - kTransportH;
    g.setColour(GhostColours::surface.darker(0.1f));
    g.fillRect(0, transportY, getWidth(), kTransportH);
    g.setColour(GhostColours::border);
    g.drawLine(0, (float)transportY + 0.5f, (float)getWidth(), (float)transportY + 0.5f, 1.0f);

    // Playing indicator
    if (proc.isPlaying())
    {
        g.setColour(GhostColours::ghostGreen);
        g.fillEllipse(8.0f, (float)transportY + 20.0f, 6.0f, 6.0f);
    }
}

void ProjectView::resized()
{
    int contentW = getWidth() - kChatW;

    // Chat
    chatPanel.setBounds(contentW, 0, kChatW, getHeight() - kTransportH);

    // Header buttons
    inviteButton.setBounds(contentW - 80, 12, 70, 28);
    uploadButton.setBounds(contentW - 158, 12, 70, 28);

    // Bounce play + waveform + delete
    int bodyY = kHeaderH + 8;
    bouncePlayBtn.setBounds(14, bodyY - 2, 26, 18);
    bounceDeleteBtn.setBounds(contentW - 36, bodyY - 2, 24, 18);

    if (hasBounce)
        bounceWaveform.setBounds(12, bodyY + 18, contentW - 24, kBounceH);
    else
        bounceWaveform.setBounds(0, 0, 0, 0);

    // Stems
    int stemsY = bodyY + 18 + kBounceH + 24;
    int stemsBottom = getHeight() - kTransportH - kDropZoneH;
    int stemsH = juce::jmax(0, stemsBottom - stemsY);
    stemsViewport.setBounds(8, stemsY, contentW - 16, stemsH);

    int totalStemH = (int)stemRows.size() * kStemRowH;
    int containerW = stemsViewport.getWidth() - (totalStemH > stemsH ? 12 : 0);
    stemsContainer.setSize(juce::jmax(containerW, 100), juce::jmax(totalStemH, stemsH));

    for (int i = 0; i < (int)stemRows.size(); ++i)
        stemRows[(size_t)i]->setBounds(0, i * kStemRowH, stemsContainer.getWidth(), kStemRowH);

    // Drop zone button
    int dropY = getHeight() - kTransportH - kDropZoneH;
    addFileButton.setBounds(contentW / 2 - 50, dropY + 22, 100, 28);

    // Transport
    int ty = getHeight() - kTransportH + 8;
    playBtn.setBounds(20, ty, 40, 32);
    stopBtn.setBounds(64, ty, 40, 32);
    posLabel.setBounds(112, ty, 120, 32);
    infoLabel.setBounds(240, ty, 200, 32);
    volumeSlider.setBounds(getWidth() - 120, ty + 4, 110, 24);
}

void ProjectView::setProjectName(const juce::String& name)
{
    projectName = name;
    repaint();
}

void ProjectView::setStems(const std::vector<StemRow::StemInfo>& stems)
{
    // Check if the stem count matches — if so, skip rebuild to preserve waveforms
    if ((int)stems.size() == (int)stemRows.size() && !stemRows.empty())
    {
        // Update existing rows in place (preserves waveform thumbnails)
        for (int i = 0; i < (int)stems.size(); ++i)
        {
            auto& existing = stemRows[(size_t)i];
            auto info = stems[(size_t)i];

            // Restore local file if needed
            if (!info.localFile.existsAsFile())
            {
                // Check if the existing row already has a file
                if (existing->getStem().localFile.existsAsFile())
                {
                    info.localFile = existing->getStem().localFile;
                }
                else
                {
                    auto key = info.name.toLowerCase();
                    auto it = localFileMap.find(key);
                    if (it != localFileMap.end() && it->second.existsAsFile())
                        info.localFile = it->second;
                }
            }

            // Only call setStem if the row doesn't already have a loaded waveform file
            if (!existing->getStem().localFile.existsAsFile() && info.localFile.existsAsFile())
                existing->setStem(info);
            // Update the stem ID to match the server (for play button to work)
            else if (existing->getStem().id != info.id)
                existing->setStem(info);
        }
        return;
    }

    // Stem list changed — rebuild, but try to preserve rows that have loaded waveforms
    // Build map of existing rows by name (lowercase) so we can reuse them
    std::map<juce::String, std::unique_ptr<StemRow>> existingByName;
    for (auto& row : stemRows)
    {
        auto key = row->getStem().name.toLowerCase();
        if (row->getStem().localFile.existsAsFile())
            existingByName[key] = std::move(row);
    }
    stemRows.clear();

    for (auto& s : stems)
    {
        auto info = s;

        // Restore local file from map if server data doesn't have one
        if (!info.localFile.existsAsFile())
        {
            auto key = info.name.toLowerCase();
            auto it = localFileMap.find(key);
            if (it != localFileMap.end() && it->second.existsAsFile())
            {
                info.localFile = it->second;
                GhostLog::write("[ProjectView] Restored local file for stem: " + info.name);
            }
        }

        // Try to reuse existing row with loaded waveform
        auto nameKey = info.name.toLowerCase();
        auto existIt = existingByName.find(nameKey);
        if (existIt != existingByName.end())
        {
            // Reuse — update the stem ID to server ID but keep the waveform
            auto& row = existIt->second;
            auto preserved = row->getStem();
            preserved.id = info.id;  // Use server ID
            preserved.muted = info.muted;
            preserved.soloed = info.soloed;
            preserved.volume = info.volume;
            row->setStem(preserved);
            row->onPlayClicked = [this](const juce::String& id) { playStem(id); };
            row->onDeleteClicked = [this](const juce::String& id) { if (onDeleteStem) onDeleteStem(id); };
            row->onMuteToggle = [this](const juce::String& id, bool m) {
                proc.getSessionManager().muteTrack(id, m);
            };
            row->onSoloToggle = [this](const juce::String& id, bool s2) {
                proc.getSessionManager().soloTrack(id, s2);
            };
            stemsContainer.addAndMakeVisible(*row);
            stemRows.push_back(std::move(row));
            existingByName.erase(existIt);
        }
        else
        {
            auto row = std::make_unique<StemRow>();
            row->setStem(info);
            row->onPlayClicked = [this](const juce::String& id) { playStem(id); };
            row->onDeleteClicked = [this](const juce::String& id) { if (onDeleteStem) onDeleteStem(id); };
            row->onMuteToggle = [this](const juce::String& id, bool m) {
                proc.getSessionManager().muteTrack(id, m);
            };
            row->onSoloToggle = [this](const juce::String& id, bool s2) {
                proc.getSessionManager().soloTrack(id, s2);
            };
            stemsContainer.addAndMakeVisible(*row);
            stemRows.push_back(std::move(row));
        }
    }
    resized();
    repaint();
}

void ProjectView::addStemFromFile(const juce::File& file)
{
    GhostLog::write("[ProjectView] addStemFromFile: " + file.getFullPathName());

    // Determine type from extension
    auto ext = file.getFileExtension().toLowerCase();
    juce::String type = "audio";
    if (ext == ".mid" || ext == ".midi") type = "midi";

    // Store in local file map so server refreshes don't lose the reference
    auto stemName = file.getFileNameWithoutExtension();
    localFileMap[stemName.toLowerCase()] = file;

    StemRow::StemInfo info;
    info.id = juce::Uuid().toString();
    info.name = stemName;
    info.type = type;
    info.localFile = file;

    auto row = std::make_unique<StemRow>();
    row->setStem(info);
    row->onPlayClicked = [this](const juce::String& id) { playStem(id); };
    row->onDeleteClicked = [this](const juce::String& id) { if (onDeleteStem) onDeleteStem(id); };
    stemsContainer.addAndMakeVisible(*row);
    stemRows.push_back(std::move(row));

    resized();
    repaint();
}

void ProjectView::setBounceFile(const juce::File& file)
{
    GhostLog::write("[ProjectView] setBounceFile: " + file.getFullPathName());
    bounceFile = file;
    hasBounce = true;
    bounceWaveform.setAudioFile(file);
    bounceWaveform.setDraggableFile(file);
    bounceDeleteBtn.setVisible(true);
    if (onBounceSet) onBounceSet(file);
    resized();
    repaint();
}

void ProjectView::playStem(const juce::String& stemId)
{
    GhostLog::write("[ProjectView] playStem: " + stemId);

    // If already playing this stem, stop
    if (currentPlayingStemId == stemId && proc.isPlaying())
    {
        stopAll();
        return;
    }

    // Find the stem's local file
    for (auto& row : stemRows)
    {
        if (row->getStem().id == stemId)
        {
            GhostLog::write("[ProjectView] Found stem, localFile=" + row->getStem().localFile.getFullPathName()
                            + " exists=" + juce::String(row->getStem().localFile.existsAsFile() ? "yes" : "no"));
        }
        if (row->getStem().id == stemId && row->getStem().localFile.existsAsFile())
        {
            currentPlayingStemId = stemId;
            proc.loadAndPlay(row->getStem().localFile);

            // Update all rows
            for (auto& r : stemRows)
            {
                r->setPlayingState(r->getStem().id == stemId);
                if (r->getStem().id != stemId)
                    r->setPlaybackPosition(0.0);
            }
            break;
        }
    }
}

void ProjectView::playBounce()
{
    if (!hasBounce || !bounceFile.existsAsFile()) return;

    if (currentPlayingStemId.isEmpty() && proc.isPlaying())
    {
        stopAll();
        return;
    }

    currentPlayingStemId = {};
    proc.loadAndPlay(bounceFile);
    bouncePlayBtn.setButtonText("||");

    for (auto& r : stemRows)
    {
        r->setPlayingState(false);
        r->setPlaybackPosition(0.0);
    }
}

void ProjectView::stopAll()
{
    proc.stopPlayback();
    currentPlayingStemId = {};
    playBtn.setButtonText(">");
    bouncePlayBtn.setButtonText(">");
    bounceWaveform.setPlaybackPosition(0.0);

    for (auto& r : stemRows)
    {
        r->setPlayingState(false);
        r->setPlaybackPosition(0.0);
    }

    posLabel.setText("0:00 / 0:00", juce::dontSendNotification);
}

juce::String ProjectView::formatTime(double seconds) const
{
    int mins = (int)(seconds / 60.0);
    int secs = (int)(seconds) % 60;
    return juce::String(mins) + ":" + juce::String(secs).paddedLeft('0', 2);
}

bool ProjectView::isInterestedInFileDrag(const juce::StringArray&) { return true; }

void ProjectView::filesDropped(const juce::StringArray& files, int x, int y)
{
    GhostLog::write("[ProjectView] filesDropped: " + juce::String(files.size()) + " files at y=" + juce::String(y));
    isDragOver = false;
    repaint();

    // Check if dropped in the bounce area (between header and stems section)
    int bounceTop = kHeaderH + 8;
    int bounceBottom = bounceTop + 18 + kBounceH + 8;
    bool droppedOnBounce = (y >= bounceTop && y <= bounceBottom);

    for (auto& path : files)
    {
        juce::File file(path);
        if (!file.existsAsFile()) continue;

        auto ext = file.getFileExtension().toLowerCase();

        // If dropped on the bounce area, or name suggests bounce, treat as bounce
        auto nameLower = file.getFileNameWithoutExtension().toLowerCase();
        bool isBounce = droppedOnBounce ||
                        nameLower.contains("bounce") || nameLower.contains("mix") ||
                        nameLower.contains("master") || nameLower.contains("full");

        if (isBounce && (ext == ".wav" || ext == ".flac" || ext == ".mp3" || ext == ".aiff"))
        {
            setBounceFile(file);
        }
        else
        {
            addStemFromFile(file);
        }

        if (onFileDropped)
            onFileDropped(file, ext);
    }
}

void ProjectView::fileDragEnter(const juce::StringArray&, int, int)
{
    isDragOver = true;
    repaint();
}

void ProjectView::fileDragExit(const juce::StringArray&)
{
    isDragOver = false;
    repaint();
}
