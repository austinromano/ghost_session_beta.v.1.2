#pragma once

#include "JuceHeader.h"
#include "../Network/ApiClient.h"
#include "../Core/AppState.h"

//==============================================================================
class FileTransferManager
{
public:
    FileTransferManager(ApiClient& api, AppState& state);

    struct TransferJob
    {
        juce::String jobId;
        juce::String fileName;
        juce::File localFile;
        bool isUpload = true;
        float progress = 0.0f;
        bool complete = false;
        bool error = false;
        juce::String remoteFileId;
    };

    void uploadFile(const juce::File& file, std::function<void(const TransferJob&)> cb);
    void downloadFile(const juce::String& fileId, const juce::String& fileName,
                      std::function<void(const TransferJob&)> cb);

    static bool isSupportedFile(const juce::File& f);

private:
    ApiClient& apiClient;
    AppState& appState;
    juce::File tempDir;
};
