#pragma once

#include "JuceHeader.h"

//==============================================================================
/**
 * Custom WebBrowserComponent that intercepts ghost:// URLs
 * to handle native drag-to-DAW operations.
 */
class GhostWebView : public juce::WebBrowserComponent
{
public:
    explicit GhostWebView(const Options& options);

    bool pageAboutToLoad(const juce::String& newURL) override;

private:
    juce::File tempDir;

    void handleDragToDaw(const juce::String& urlString);
    juce::File downloadToTemp(const juce::String& downloadUrl, const juce::String& fileName);

    // Parse a query parameter from a URL string
    static juce::String getQueryParam(const juce::String& url, const juce::String& paramName);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GhostWebView)
};
