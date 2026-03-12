#include "DragDropZone.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"

DragDropZone::DragDropZone(GhostSessionProcessor& processor)
    : proc(processor)
{
    addTrackButton.onClick = [this] {
        auto chooser = std::make_shared<juce::FileChooser>(
            "Add to Session", juce::File{},
            "*.wav;*.flac;*.mp3;*.aiff;*.mid;*.midi");

        chooser->launchAsync(juce::FileBrowserComponent::openMode |
                             juce::FileBrowserComponent::canSelectFiles,
            [this, chooser](const juce::FileChooser& fc) {
                auto file = fc.getResult();
                if (file.existsAsFile())
                {
                    auto ext = file.getFileExtension().toLowerCase();
                    SessionTrack::TrackType type = SessionTrack::TrackType::Audio;
                    if (ext == ".mid" || ext == ".midi")
                        type = SessionTrack::TrackType::MIDI;

                    proc.getSessionManager().addTrack(
                        file.getFileNameWithoutExtension(),
                        type, {}, file.getFileName());
                }
            });
    };
    addAndMakeVisible(addTrackButton);
}

void DragDropZone::paint(juce::Graphics& g)
{
    GhostLog::write("[DropZone] paint start");
    auto bounds = getLocalBounds().toFloat().reduced(8.0f);

    if (isDragOver)
    {
        g.setColour(GhostColours::ghostGreen.withAlpha(0.1f));
        g.fillRoundedRectangle(bounds, 8.0f);
        g.setColour(GhostColours::ghostGreen);
        g.drawRoundedRectangle(bounds, 8.0f, 2.0f);

        g.setFont(juce::Font(16.0f, juce::Font::bold));
        g.drawText("Drop to add track", bounds, juce::Justification::centred);
    }
    else
    {
        // Dashed border effect
        g.setColour(GhostColours::border);
        g.drawRoundedRectangle(bounds, 8.0f, 1.0f);

        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::plain));
        g.drawText("Drag MIDI, loops, stems, or drum patterns here",
                   bounds.reduced(0, 8), juce::Justification::centredTop);
    }
}

void DragDropZone::resized()
{
    addTrackButton.setBounds(getLocalBounds().getCentreX() - 60,
                             getLocalBounds().getCentreY() - 2,
                             120, 28);
}

bool DragDropZone::isInterestedInFileDrag(const juce::StringArray&) { return true; }

void DragDropZone::filesDropped(const juce::StringArray& files, int, int)
{
    isDragOver = false;
    repaint();

    for (auto& path : files)
    {
        juce::File file(path);
        if (!file.existsAsFile()) continue;

        auto ext = file.getFileExtension().toLowerCase();
        SessionTrack::TrackType type = SessionTrack::TrackType::Audio;

        if (ext == ".mid" || ext == ".midi")
            type = SessionTrack::TrackType::MIDI;
        else if (ext == ".wav" || ext == ".flac" || ext == ".mp3" || ext == ".aiff")
        {
            // Heuristic: short files are loops
            juce::AudioFormatManager fm;
            fm.registerBasicFormats();
            if (auto* reader = fm.createReaderFor(file))
            {
                double duration = (double)reader->lengthInSamples / reader->sampleRate;
                if (duration < 16.0) type = SessionTrack::TrackType::Loop;
                delete reader;
            }
        }

        proc.getSessionManager().addTrack(
            file.getFileNameWithoutExtension(),
            type, {}, file.getFileName());
    }
}

void DragDropZone::fileDragEnter(const juce::StringArray&, int, int)
{
    isDragOver = true;
    repaint();
}

void DragDropZone::fileDragExit(const juce::StringArray&)
{
    isDragOver = false;
    repaint();
}
