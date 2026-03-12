#include "TrackListPanel.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"

//==============================================================================
// TrackRow
//==============================================================================
TrackRow::TrackRow()
{
    addAndMakeVisible(waveform);

    muteBtn.setClickingTogglesState(true);
    muteBtn.onClick = [this] {
        if (onMuteToggle) onMuteToggle(currentTrack.trackId, muteBtn.getToggleState());
    };
    addAndMakeVisible(muteBtn);

    soloBtn.setClickingTogglesState(true);
    soloBtn.onClick = [this] {
        if (onSoloToggle) onSoloToggle(currentTrack.trackId, soloBtn.getToggleState());
    };
    addAndMakeVisible(soloBtn);

    removeBtn.onClick = [this] {
        if (onRemove) onRemove(currentTrack.trackId);
    };
    addAndMakeVisible(removeBtn);

    volumeSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    volumeSlider.setRange(0.0, 1.0, 0.01);
    volumeSlider.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);
    volumeSlider.onValueChange = [this] {
        if (onVolumeChange) onVolumeChange(currentTrack.trackId, (float)volumeSlider.getValue());
    };
    addAndMakeVisible(volumeSlider);
}

void TrackRow::setTrack(const SessionTrack& track)
{
    currentTrack = track;
    muteBtn.setToggleState(track.isMuted, juce::dontSendNotification);
    soloBtn.setToggleState(track.isSoloed, juce::dontSendNotification);
    volumeSlider.setValue(track.volume, juce::dontSendNotification);

    if (!track.peaks.empty())
        waveform.setThumbnailData(track.peaks);

    repaint();
}

void TrackRow::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat().reduced(2.0f, 1.0f);

    // Track card background
    g.setColour(GhostColours::surface);
    g.fillRoundedRectangle(bounds, 4.0f);

    // Left colour strip — unique per track type
    juce::Colour typeCol;
    switch (currentTrack.type)
    {
        case SessionTrack::TrackType::MIDI:        typeCol = GhostColours::midiTrack; break;
        case SessionTrack::TrackType::DrumPattern:  typeCol = GhostColours::drumTrack; break;
        case SessionTrack::TrackType::Loop:         typeCol = GhostColours::loopTrack; break;
        default:                                    typeCol = GhostColours::audioTrack; break;
    }
    g.setColour(typeCol);
    g.fillRoundedRectangle(bounds.getX(), bounds.getY(), 4.0f, bounds.getHeight(), 2.0f);

    // Track name
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText(currentTrack.name, 14, 6, 120, 16, juce::Justification::centredLeft);

    // Owner name
    g.setColour(currentTrack.ownerColour.isTransparent() ?
                GhostColours::textSecondary : currentTrack.ownerColour);
    g.setFont(juce::Font(10.0f, juce::Font::plain));
    g.drawText("@" + currentTrack.ownerName, 14, 24, 120, 12,
               juce::Justification::centredLeft);

    // File info
    juce::String meta;
    if (currentTrack.bpm > 0) meta += juce::String(currentTrack.bpm, 0) + " BPM";
    if (currentTrack.key.isNotEmpty())
    {
        if (meta.isNotEmpty()) meta += "  |  ";
        meta += currentTrack.key;
    }

    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(juce::Font::getDefaultMonospacedFontName(), 10.0f, juce::Font::plain));
    g.drawText(meta, 14, 38, 120, 12, juce::Justification::centredLeft);
}

void TrackRow::resized()
{
    auto bounds = getLocalBounds();
    int controlW = 140;

    // Left side: track info (painted in paint())
    auto controlArea = bounds.removeFromLeft(controlW);

    // Right side: buttons
    auto btnArea = bounds.removeFromRight(120);
    muteBtn.setBounds(btnArea.removeFromLeft(28).reduced(2, 10));
    soloBtn.setBounds(btnArea.removeFromLeft(28).reduced(2, 10));
    removeBtn.setBounds(btnArea.removeFromLeft(28).reduced(2, 10));

    // Volume slider
    volumeSlider.setBounds(btnArea.reduced(2, 14));

    // Waveform takes remaining space
    waveform.setBounds(bounds.reduced(4, 6));
}

//==============================================================================
// TrackListPanel
//==============================================================================
TrackListPanel::TrackListPanel(GhostSessionProcessor& processor)
    : proc(processor)
{
    trackListBox.setModel(this);
    trackListBox.setRowHeight(60);
    trackListBox.setColour(juce::ListBox::backgroundColourId, juce::Colours::transparentBlack);
    addAndMakeVisible(trackListBox);

    proc.getSessionManager().getSessionState().addListener(this);
}

TrackListPanel::~TrackListPanel()
{
    proc.getSessionManager().getSessionState().removeListener(this);
}

void TrackListPanel::paint(juce::Graphics& g)
{
    GhostLog::write("[TrackList] paint start");
    g.setColour(GhostColours::background);
    g.fillRect(getLocalBounds());

    if (tracks.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(14.0f, juce::Font::italic));
        g.drawText("No tracks yet — drag a file or click + to add",
                   getLocalBounds(), juce::Justification::centred);
    }
    GhostLog::write("[TrackList] paint done");
}

void TrackListPanel::resized()
{
    trackListBox.setBounds(getLocalBounds());
}

int TrackListPanel::getNumRows() { return (int)tracks.size(); }

void TrackListPanel::paintListBoxItem(int, juce::Graphics&, int, int, bool) {}

juce::Component* TrackListPanel::refreshComponentForRow(int row, bool, juce::Component* existing)
{
    if (row < 0 || row >= (int)tracks.size()) return existing;

    auto* trackRow = dynamic_cast<TrackRow*>(existing);
    if (!trackRow) trackRow = new TrackRow();

    trackRow->setTrack(tracks[(size_t)row]);

    trackRow->onMuteToggle = [this](const juce::String& id, bool m) {
        proc.getSessionManager().muteTrack(id, m);
    };
    trackRow->onSoloToggle = [this](const juce::String& id, bool s) {
        proc.getSessionManager().soloTrack(id, s);
    };
    trackRow->onVolumeChange = [this](const juce::String& id, float v) {
        proc.getSessionManager().setTrackVolume(id, v);
    };
    trackRow->onRemove = [this](const juce::String& id) {
        proc.getSessionManager().removeTrack(id);
    };

    return trackRow;
}

void TrackListPanel::onTrackAdded(const SessionTrack&)   { refreshTracks(); }
void TrackListPanel::onTrackRemoved(const juce::String&)  { refreshTracks(); }
void TrackListPanel::onTrackUpdated(const SessionTrack&)  { refreshTracks(); }

void TrackListPanel::refreshTracks()
{
    tracks = proc.getSessionManager().getSessionState().getTracks();
    trackListBox.updateContent();
    trackListBox.repaint();
    repaint();
}
