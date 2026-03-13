#include "GhostWebView.h"
#include "GhostLog.h"

GhostWebView::GhostWebView(const Options& options)
    : WebBrowserComponent(options)
{
    tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                  .getChildFile("GhostSession");
    if (!tempDir.exists())
        tempDir.createDirectory();
}

bool GhostWebView::pageAboutToLoad(const juce::String& newURL)
{
    if (newURL.startsWith("ghost://drag-to-daw"))
    {
        GhostLog::write("[WebView] Intercepted drag-to-daw request");
        handleDragToDaw(newURL);
        return false; // Block the navigation
    }

    return true; // Allow normal navigation
}

juce::String GhostWebView::getQueryParam(const juce::String& url, const juce::String& paramName)
{
    // Find ?key=value or &key=value
    auto search = paramName + "=";
    int startIdx = url.indexOf(search);

    if (startIdx < 0)
        return {};

    startIdx += search.length();
    int endIdx = url.indexOf(startIdx, "&");

    if (endIdx < 0)
        endIdx = url.length();

    return juce::URL::removeEscapeChars(url.substring(startIdx, endIdx));
}

void GhostWebView::handleDragToDaw(const juce::String& urlString)
{
    auto downloadUrl = getQueryParam(urlString, "url");
    auto fileName = getQueryParam(urlString, "fileName");

    if (downloadUrl.isEmpty() || fileName.isEmpty())
    {
        GhostLog::write("[WebView] drag-to-daw missing url or fileName param");
        return;
    }

    GhostLog::write("[WebView] Downloading: " + fileName);
    auto localFile = downloadToTemp(downloadUrl, fileName);

    if (localFile.existsAsFile())
    {
        GhostLog::write("[WebView] Starting native drag: " + localFile.getFullPathName());
        juce::DragAndDropContainer::performExternalDragDropOfFiles(
            { localFile.getFullPathName() }, false, this);
    }
    else
    {
        GhostLog::write("[WebView] Download failed for: " + fileName);
    }
}

juce::File GhostWebView::downloadToTemp(const juce::String& downloadUrl, const juce::String& fileName)
{
    auto destFile = tempDir.getChildFile(fileName);

    // If already cached, return it
    if (destFile.existsAsFile() && destFile.getSize() > 0)
    {
        GhostLog::write("[WebView] Using cached file: " + destFile.getFullPathName());
        return destFile;
    }

    juce::URL url(downloadUrl);
    auto stream = url.createInputStream(
        juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
            .withConnectionTimeoutMs(15000));

    if (stream != nullptr)
    {
        juce::FileOutputStream fos(destFile);

        if (fos.openedOk())
        {
            fos.writeFromInputStream(*stream, -1);
            fos.flush();
            GhostLog::write("[WebView] Downloaded " + juce::String(destFile.getSize()) + " bytes");
        }
    }

    return destFile;
}
