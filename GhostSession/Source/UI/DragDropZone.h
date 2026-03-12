#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"

class GhostSessionProcessor;

//==============================================================================
/**
 * DragDropZone — Drop area for adding files to the session.
 *
 * Producers drag MIDI, loops, drum patterns, or stems from their
 * desktop or DAW into this zone to add a new track to the session.
 */
class DragDropZone : public juce::Component,
                     public juce::FileDragAndDropTarget
{
public:
    explicit DragDropZone(GhostSessionProcessor& processor);

    void paint(juce::Graphics&) override;
    void resized() override;

    bool isInterestedInFileDrag(const juce::StringArray&) override;
    void filesDropped(const juce::StringArray& files, int x, int y) override;
    void fileDragEnter(const juce::StringArray&, int, int) override;
    void fileDragExit(const juce::StringArray&) override;

private:
    GhostSessionProcessor& proc;
    bool isDragOver = false;
    juce::TextButton addTrackButton { "+ Add Track" };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DragDropZone)
};
