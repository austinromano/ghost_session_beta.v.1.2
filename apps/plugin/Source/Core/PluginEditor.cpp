#include "PluginEditor.h"

//==============================================================================
GhostSessionEditor::GhostSessionEditor(GhostSessionProcessor& p)
    : AudioProcessorEditor(&p), proc(p)
{
    // Configure WebView with WebView2 backend on Windows
    auto options = juce::WebBrowserComponent::Options()
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withUserAgent("GhostSession/2.0 JUCE-Plugin");

    webView = std::make_unique<GhostWebView>(options);
    addAndMakeVisible(*webView);

    // Navigate to the React app
    webView->goToURL(getAppUrl());

    setResizable(true, true);
    setResizeLimits(900, 500, 1920, 1200);
    setSize(1100, 720);
}

GhostSessionEditor::~GhostSessionEditor()
{
    // Remove the WebView from the component hierarchy first,
    // then destroy it. This ensures no pending async callbacks
    // can reference a half-destroyed component tree.
    if (webView)
    {
        removeChildComponent(webView.get());
        webView->setVisible(false);
    }
    webView = nullptr;
}

void GhostSessionEditor::paint(juce::Graphics& g)
{
    // Dark background shown briefly while WebView loads
    g.fillAll(juce::Colour(0xFF1A1A2E));

    if (!webView || !webView->isVisible())
    {
        g.setColour(juce::Colour(0xFF8B5CF6));
        g.setFont(juce::Font(18.0f));
        g.drawText("Welcome to Ghost Session",
                   getLocalBounds(), juce::Justification::centred);
    }
}

void GhostSessionEditor::resized()
{
    if (webView)
        webView->setBounds(getLocalBounds());
}

juce::String GhostSessionEditor::getAppUrl() const
{
    // Production: point to the cloud server
    // For local dev, change this to "http://127.0.0.1:1420" or "http://localhost:3000"
    juce::String url = "https://ghostsessionv8-production.up.railway.app";

    // Pass auth token if available so the React app can auto-login
    auto token = proc.getClient().getAuthToken();
    if (token.isNotEmpty())
        url += "?token=" + juce::URL::addEscapeChars(token, true) + "&mode=plugin";
    else
        url += "?mode=plugin";

    return url;
}
