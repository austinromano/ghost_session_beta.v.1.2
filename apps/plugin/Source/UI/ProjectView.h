#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "WaveformDisplay.h"
#include <map>

class GhostSessionProcessor;

//==============================================================================
/**
 * StemRow — A single stem/bounce track with waveform, playback, and controls.
 */
class StemRow : public juce::Component
{
public:
    struct StemInfo
    {
        juce::String id;
        juce::String name;
        juce::String type;       // "audio", "midi", "drum", "loop"
        juce::String ownerName;
        float volume = 0.8f;
        float pan = 0.0f;
        bool muted = false;
        bool soloed = false;
        juce::File localFile;
    };

    StemRow();
    void setStem(const StemInfo& info);
    const StemInfo& getStem() const { return stem; }
    void setPlayingState(bool playing);
    void setPlaybackPosition(double pos);
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;

    std::function<void(const juce::String&, bool)> onMuteToggle;
    std::function<void(const juce::String&, bool)> onSoloToggle;
    std::function<void(const juce::String&)> onPlayClicked;
    std::function<void(const juce::String&)> onDeleteClicked;

private:
    StemInfo stem;
    WaveformDisplay waveform;
    juce::TextButton playBtn { ">" };
    juce::TextButton muteBtn { "M" };
    juce::TextButton soloBtn { "S" };
    juce::TextButton deleteBtn { "X" };
    bool isCurrentlyPlaying = false;
    bool dragging = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(StemRow)
};

//==============================================================================
/**
 * ChatPanel — Persistent chat panel on the right side.
 */
class ChatPanel : public juce::Component
{
public:
    ChatPanel();
    void paint(juce::Graphics&) override;
    void resized() override;

    void addMessage(const juce::String& user, const juce::String& text,
                    juce::Colour colour = GhostColours::textSecondary);
    void clear();

    std::function<void(const juce::String&)> onSendMessage;

private:
    struct Msg { juce::String user; juce::String text; juce::Colour colour; };
    std::vector<Msg> messages;

    juce::TextEditor inputField;
    juce::TextButton sendButton { ">" };

    void sendCurrent();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ChatPanel)
};

//==============================================================================
/**
 * ProjectView — The main project workspace.
 *
 * ┌──────────────────────────────────────────┬─────────────┐
 * │  Project Name         [Upload] [+Invite] │             │
 * ├──────────────────────────────────────────┤   Chat      │
 * │  FULL MIX  [>]                           │             │
 * │  [═══════waveform═══════════════════]    │  messages   │
 * │                                          │             │
 * │  STEMS (3)                               │             │
 * │  [> Drums  [waveform]             [M][S]]│             │
 * │  [> Bass   [waveform]             [M][S]]│             │
 * │  [> Vocals [waveform]             [M][S]]│             │
 * │                                          │  [input]    │
 * │  ┌── Drop files here ──────────────────┐ │  [Send]     │
 * ├──────────────────────────────────────────┴─────────────┤
 * │  >  ■  0:00 / 3:45   140 BPM  C             🔊 ──○──  │
 * └────────────────────────────────────────────────────────┘
 */
class ProjectView : public juce::Component,
                    public juce::FileDragAndDropTarget,
                    public juce::Timer
{
public:
    explicit ProjectView(GhostSessionProcessor& processor);
    ~ProjectView() override;

    void paint(juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;

    void setProjectName(const juce::String& name);
    void setStems(const std::vector<StemRow::StemInfo>& stems);
    void addStemFromFile(const juce::File& file);
    void setBounceFile(const juce::File& file);

    ChatPanel& getChat() { return chatPanel; }
    void setLocalFileMap(const std::map<juce::String, juce::File>& map) { localFileMap = map; }

    // File drop
    bool isInterestedInFileDrag(const juce::StringArray&) override;
    void filesDropped(const juce::StringArray& files, int x, int y) override;
    void fileDragEnter(const juce::StringArray&, int, int) override;
    void fileDragExit(const juce::StringArray&) override;

    std::function<void()> onInviteClicked;
    std::function<void(const juce::File&, const juce::String&)> onFileDropped;
    std::function<void(const juce::String&)> onDeleteStem;
    std::function<void(const juce::File&)> onBounceSet;
    std::function<void()> onBounceCleared;

private:
    GhostSessionProcessor& proc;

    // Header
    juce::String projectName;
    juce::TextButton uploadButton { "Upload" };
    juce::TextButton inviteButton { "+ Invite" };

    // Full bounce
    WaveformDisplay bounceWaveform;
    juce::TextButton bouncePlayBtn { ">" };
    juce::TextButton bounceDeleteBtn { "X" };
    juce::File bounceFile;
    bool hasBounce = false;

    // Stems
    std::vector<std::unique_ptr<StemRow>> stemRows;
    juce::Viewport stemsViewport;
    juce::Component stemsContainer;
    juce::String currentPlayingStemId;

    // Chat
    ChatPanel chatPanel;

    // Drop zone
    bool isDragOver = false;
    juce::TextButton addFileButton { "+ Add Files" };

    // Transport
    juce::TextButton playBtn { ">" };
    juce::TextButton stopBtn { "||" };
    juce::Label posLabel;
    juce::Label infoLabel;
    juce::Slider volumeSlider;

    std::unique_ptr<juce::FileChooser> fileChooser;

    // Map stem name → local file, so server refreshes don't lose file refs
    std::map<juce::String, juce::File> localFileMap;

    void playStem(const juce::String& stemId);
    void playBounce();
    void stopAll();
    juce::String formatTime(double seconds) const;

    static constexpr int kHeaderH = 52;
    static constexpr int kBounceH = 80;
    static constexpr int kStemRowH = 60;
    static constexpr int kDropZoneH = 64;
    static constexpr int kTransportH = 48;
    static constexpr int kChatW = 240;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ProjectView)
};
