#include "FileTransferManager.h"

FileTransferManager::FileTransferManager(ApiClient& api, AppState& state)
    : apiClient(api), appState(state)
{
    tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                  .getChildFile("GhostSession");
    if (!tempDir.exists()) tempDir.createDirectory();
}

void FileTransferManager::uploadFile(const juce::File& file,
                                      std::function<void(const TransferJob&)> cb)
{
    if (!file.existsAsFile() || !isSupportedFile(file))
    {
        TransferJob failed;
        failed.error = true;
        if (cb) cb(failed);
        return;
    }

    TransferJob job;
    job.jobId = juce::Uuid().toString();
    job.fileName = file.getFileName();
    job.localFile = file;
    job.isUpload = true;

    apiClient.uploadFile(file, {},
        [](float) {},
        [job, cb = std::move(cb)](const ApiClient::Response& resp) mutable {
            job.complete = true;
            if (resp.isSuccess())
                job.remoteFileId = resp.body["fileId"].toString();
            else
                job.error = true;
            if (cb) cb(job);
        });
}

void FileTransferManager::downloadFile(const juce::String& fileId,
                                        const juce::String& fileName,
                                        std::function<void(const TransferJob&)> cb)
{
    apiClient.getDownloadUrl(fileId, [this, fileId, fileName, cb = std::move(cb)]
                             (const ApiClient::Response& resp) mutable
    {
        TransferJob job;
        job.jobId = juce::Uuid().toString();
        job.fileName = fileName;
        job.isUpload = false;
        job.localFile = appState.getDownloadDirectory().getChildFile(fileName);

        if (resp.isSuccess())
        {
            // Download happens in real impl
            job.complete = true;
        }
        else
        {
            job.error = true;
        }

        if (cb) cb(job);
    });
}

bool FileTransferManager::isSupportedFile(const juce::File& f)
{
    auto ext = f.getFileExtension().toLowerCase();
    return ext == ".wav" || ext == ".flac" || ext == ".mp3" || ext == ".aiff" ||
           ext == ".mid" || ext == ".midi" || ext == ".ogg";
}
