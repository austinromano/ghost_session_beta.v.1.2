#include "SessionView.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"

SessionView::SessionView(GhostSessionProcessor& processor)
    : proc(processor),
      collabPanel(processor),
      trackList(processor),
      transportBar(processor),
      chatOverlay(processor),
      dropZone(processor)
{
    GhostLog::write("[SessionView] ctor: members constructed OK");

    // Session header labels
    sessionNameLabel.setFont(juce::Font(16.0f, juce::Font::bold));
    sessionNameLabel.setColour(juce::Label::textColourId, GhostColours::textPrimary);
    sessionCodeLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    sessionCodeLabel.setColour(juce::Label::textColourId, GhostColours::ghostGreen);
    tempoLabel.setFont(juce::Font(13.0f, juce::Font::bold));
    tempoLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    keyLabel.setFont(juce::Font(13.0f, juce::Font::bold));
    keyLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);

    GhostLog::write("[SessionView] ctor: labels configured");

    // Set text from session state
    auto& ss = proc.getSessionManager().getSessionState();
    sessionNameLabel.setText(ss.getSessionName(), juce::dontSendNotification);
    sessionCodeLabel.setText("Code: " + proc.getSessionManager().getSessionCode(),
                             juce::dontSendNotification);
    tempoLabel.setText(juce::String(ss.getTempo(), 1) + " BPM", juce::dontSendNotification);
    keyLabel.setText(ss.getKey(), juce::dontSendNotification);

    GhostLog::write("[SessionView] ctor: text set");

    // Add labels
    addAndMakeVisible(sessionNameLabel);
    addAndMakeVisible(sessionCodeLabel);
    addAndMakeVisible(tempoLabel);
    addAndMakeVisible(keyLabel);
    GhostLog::write("[SessionView] ctor: labels added");

    // Buttons
    leaveButton.onClick = [this] { proc.getSessionManager().leaveSession(); };
    inviteButton.onClick = [this] { /* TODO */ };
    chatButton.setClickingTogglesState(true);
    chatButton.onClick = [this] { chatOverlay.setVisible(chatButton.getToggleState()); };
    addAndMakeVisible(leaveButton);
    addAndMakeVisible(inviteButton);
    addAndMakeVisible(chatButton);
    GhostLog::write("[SessionView] ctor: buttons added");

    // Panels — add one at a time with logging
    addAndMakeVisible(collabPanel);
    GhostLog::write("[SessionView] ctor: collabPanel added");

    addAndMakeVisible(trackList);
    GhostLog::write("[SessionView] ctor: trackList added");

    addAndMakeVisible(transportBar);
    GhostLog::write("[SessionView] ctor: transportBar added");

    addAndMakeVisible(dropZone);
    GhostLog::write("[SessionView] ctor: dropZone added");

    chatOverlay.setVisible(false);
    addChildComponent(chatOverlay);
    GhostLog::write("[SessionView] ctor: chatOverlay added (hidden)");

    GhostLog::write("[SessionView] Constructor done");
}

void SessionView::paint(juce::Graphics& g)
{
    GhostLog::write("[SessionView] paint w=" + juce::String(getWidth()) + " h=" + juce::String(getHeight()));
    g.fillAll(GhostColours::background);

    // Header background
    auto header = getLocalBounds().removeFromTop(kHeaderHeight);
    g.setColour(GhostColours::surface);
    g.fillRect(header);

    // Header bottom border
    g.setColour(GhostColours::border);
    g.drawLine(0.0f, (float)kHeaderHeight - 0.5f,
               (float)getWidth(), (float)kHeaderHeight - 0.5f, 1.0f);
    GhostLog::write("[SessionView] paint done");
}

void SessionView::resized()
{
    GhostLog::write("[SessionView] resized w=" + juce::String(getWidth()) + " h=" + juce::String(getHeight()));
    auto bounds = getLocalBounds();

    // Header
    auto header = bounds.removeFromTop(kHeaderHeight).reduced(12, 8);
    sessionNameLabel.setBounds(header.removeFromLeft(200));
    sessionCodeLabel.setBounds(header.removeFromLeft(140));
    tempoLabel.setBounds(header.removeFromLeft(80));
    keyLabel.setBounds(header.removeFromLeft(60));

    leaveButton.setBounds(header.removeFromRight(60).reduced(2));
    inviteButton.setBounds(header.removeFromRight(80).reduced(2));
    chatButton.setBounds(header.removeFromRight(60).reduced(2));

    // Transport bar at bottom
    transportBar.setBounds(bounds.removeFromBottom(kTransportHeight));

    // Left collaborator panel
    collabPanel.setBounds(bounds.removeFromLeft(kCollabWidth));

    // Drop zone at the bottom of the track area
    auto dropArea = bounds.removeFromBottom(80);
    dropZone.setBounds(dropArea);

    trackList.setBounds(bounds);

    // Chat overlay — floating on right side
    if (chatOverlay.isVisible())
    {
        int chatW = 300;
        chatOverlay.setBounds(getWidth() - chatW - 10,
                              kHeaderHeight + 10,
                              chatW,
                              getHeight() - kHeaderHeight - kTransportHeight - 20);
    }
    GhostLog::write("[SessionView] resized done");
}
