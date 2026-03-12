#pragma once

#include "JuceHeader.h"
#include "../Core/PluginProcessor.h"
#include "TrackListPanel.h"
#include "CollaboratorPanel.h"
#include "TransportBar.h"
#include "ChatOverlay.h"
#include "DragDropZone.h"
#include "GhostTheme.h"

// Forward declaration
class GhostSessionProcessor;

//==============================================================================
/**
 * SessionView — The main UI when a session is active.
 *
 * Layout:
 * ┌──────────────────────────────────────────────┐
 * │ Session Header (name, code, tempo, key)  48px│
 * ├──────────┬───────────────────────────────────┤
 * │ Collab   │          Track List               │
 * │ Panel    │     (DAW-style arrangement)       │
 * │ (200px)  │                                   │
 * │          │   [Track 1 - Drums - @Producer]   │
 * │ Avatars  │   [Track 2 - Bass  - @Producer]   │
 * │ Online   │   [Track 3 - Keys  - @Producer]   │
 * │ Status   │                                   │
 * │          │      [Drop Zone for files]        │
 * │ [Chat]   │                                   │
 * ├──────────┴───────────────────────────────────┤
 * │        Transport Bar (play/stop/tempo)   64px│
 * └──────────────────────────────────────────────┘
 */
class SessionView : public juce::Component
{
public:
    explicit SessionView(GhostSessionProcessor& processor);
    ~SessionView() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

    // Access sub-panels
    TrackListPanel& getTrackList()       { return trackList; }
    CollaboratorPanel& getCollabPanel()  { return collabPanel; }
    TransportBar& getTransportBar()      { return transportBar; }

private:
    GhostSessionProcessor& proc;

    CollaboratorPanel collabPanel;
    TrackListPanel trackList;
    TransportBar transportBar;
    ChatOverlay chatOverlay;
    DragDropZone dropZone;

    // Session header elements
    juce::Label sessionNameLabel;
    juce::Label sessionCodeLabel;
    juce::Label tempoLabel;
    juce::Label keyLabel;
    juce::TextButton leaveButton { "Leave" };
    juce::TextButton inviteButton { "+ Invite" };
    juce::TextButton chatButton { "Chat" };

    static constexpr int kHeaderHeight = 48;
    static constexpr int kCollabWidth = 200;
    static constexpr int kTransportHeight = 64;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SessionView)
};
