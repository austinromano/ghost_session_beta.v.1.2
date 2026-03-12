#pragma once

#include "JuceHeader.h"
#include "FileTransferManager.h"

//==============================================================================
/**
 * Handles drag-to-DAW operations — drags files from Ghost Session
 * into the user's DAW tracks.
 */
class DragDropHandler
{
public:
    explicit DragDropHandler(FileTransferManager& ftm);

    void startDragToDaw(juce::Component* source, const juce::File& localFile);
    std::vector<juce::File> processIncomingDrop(const juce::StringArray& paths);

private:
    FileTransferManager& fileTransfer;
};
