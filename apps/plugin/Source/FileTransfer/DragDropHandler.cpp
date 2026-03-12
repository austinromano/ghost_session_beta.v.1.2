#include "DragDropHandler.h"

DragDropHandler::DragDropHandler(FileTransferManager& ftm) : fileTransfer(ftm) {}

void DragDropHandler::startDragToDaw(juce::Component* source, const juce::File& localFile)
{
    if (!localFile.existsAsFile() || !source) return;

    juce::DragAndDropContainer::performExternalDragDropOfFiles(
        { localFile.getFullPathName() }, false, source);
}

std::vector<juce::File> DragDropHandler::processIncomingDrop(const juce::StringArray& paths)
{
    std::vector<juce::File> valid;
    for (auto& p : paths)
    {
        juce::File f(p);
        if (f.existsAsFile() && FileTransferManager::isSupportedFile(f))
            valid.push_back(f);
    }
    return valid;
}
