#pragma once

#include "JuceHeader.h"
#include "../Session/SessionState.h"
#include "WaveformDisplay.h"
#include "GhostTheme.h"

class GhostSessionProcessor;

//==============================================================================
/**
 * A single track row in the session — DAW mixer-channel style.
 */
class TrackRow : public juce::Component
{
public:
    TrackRow();
    void setTrack(const SessionTrack& track);
    void paint(juce::Graphics&) override;
    void resized() override;

    std::function<void(const juce::String& trackId, bool muted)> onMuteToggle;
    std::function<void(const juce::String& trackId, bool soloed)> onSoloToggle;
    std::function<void(const juce::String& trackId, float volume)> onVolumeChange;
    std::function<void(const juce::String& trackId)> onRemove;

private:
    SessionTrack currentTrack;
    WaveformDisplay waveform;
    juce::TextButton muteBtn { "M" };
    juce::TextButton soloBtn { "S" };
    juce::TextButton removeBtn { "X" };
    juce::Slider volumeSlider;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TrackRow)
};

//==============================================================================
/**
 * Middle panel — DAW-style track arrangement view.
 */
class TrackListPanel : public juce::Component,
                       public juce::ListBoxModel,
                       public SessionState::Listener
{
public:
    explicit TrackListPanel(GhostSessionProcessor& processor);
    ~TrackListPanel() override;

    void paint(juce::Graphics&) override;
    void resized() override;

    int getNumRows() override;
    void paintListBoxItem(int, juce::Graphics&, int, int, bool) override;
    juce::Component* refreshComponentForRow(int, bool, juce::Component*) override;

    // SessionState::Listener
    void onTrackAdded(const SessionTrack& track) override;
    void onTrackRemoved(const juce::String& trackId) override;
    void onTrackUpdated(const SessionTrack& track) override;

private:
    GhostSessionProcessor& proc;
    juce::ListBox trackListBox;
    std::vector<SessionTrack> tracks;

    void refreshTracks();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TrackListPanel)
};
