#include "DashboardView.h"

//==============================================================================
// SessionsListPanel
//==============================================================================
SessionsListPanel::SessionsListPanel()
{
    uploadButton.onClick = [this] { if (onUploadClicked) onUploadClicked(); };
    addAndMakeVisible(uploadButton);
}

void SessionsListPanel::paint(juce::Graphics& g)
{
    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("Saved Sessions", 12, 8, getWidth() - 120, 18,
               juce::Justification::centredLeft);

    int y = 44;
    for (auto& s : sessions)
    {
        if (y > getHeight() - 20) break;

        // File icon area
        g.setColour(GhostColours::ghostGreen.withAlpha(0.15f));
        g.fillRoundedRectangle(16.0f, (float)y, 36.0f, 36.0f, 6.0f);
        g.setColour(GhostColours::ghostGreen);
        g.setFont(juce::Font(10.0f, juce::Font::bold));

        // Show file extension as icon text
        auto ext = s.fileName.fromLastOccurrenceOf(".", false, false).toUpperCase();
        g.drawText(ext, 16, y, 36, 36, juce::Justification::centred);

        // File name
        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(13.0f, juce::Font::plain));
        g.drawText(s.fileName, 62, y + 2, getWidth() - 74, 16,
                   juce::Justification::centredLeft);

        // Details
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(10.0f, juce::Font::plain));

        juce::String sizeStr;
        if (s.fileSize > 1024 * 1024)
            sizeStr = juce::String(s.fileSize / (1024.0 * 1024.0), 1) + " MB";
        else if (s.fileSize > 1024)
            sizeStr = juce::String(s.fileSize / 1024) + " KB";
        else
            sizeStr = juce::String(s.fileSize) + " B";

        auto detail = sizeStr;
        if (s.uploaderName.isNotEmpty())
            detail += " - " + s.uploaderName;

        g.drawText(detail, 62, y + 20, getWidth() - 74, 14,
                   juce::Justification::centredLeft);

        y += 48;
    }

    if (sessions.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::italic));
        auto emptyArea = getLocalBounds().withTop(44);
        g.drawText("No sessions uploaded yet. Click Upload to add one.", emptyArea,
                   juce::Justification::centred);
    }
}

void SessionsListPanel::resized()
{
    uploadButton.setBounds(getWidth() - 130, 6, 118, 26);
}

void SessionsListPanel::setSessions(const std::vector<GhostSessionFile>& s)
{
    sessions = s;
    repaint();
}

int SessionsListPanel::getRowAtPosition(int y) const
{
    int startY = 44;
    if (y < startY) return -1;
    int row = (y - startY) / 48;
    if (row >= 0 && row < (int)sessions.size()) return row;
    return -1;
}

void SessionsListPanel::mouseDown(const juce::MouseEvent& e)
{
    int row = getRowAtPosition(e.y);
    if (row >= 0 && onSessionClicked)
        onSessionClicked(sessions[(size_t)row]);
}

//==============================================================================
// DashboardView
//==============================================================================
DashboardView::DashboardView()
{
    addAndMakeVisible(trackStatus);
    addAndMakeVisible(sessionsPanel);
    addAndMakeVisible(commentsPanel);
    addAndMakeVisible(versionsPanel);
    addAndMakeVisible(collabPanel);
    addAndMakeVisible(pluginStatus);

    // Default: show sessions + comments
    collabPanel.setVisible(false);
    versionsPanel.setVisible(false);
}

void DashboardView::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);
}

void DashboardView::resized()
{
    auto bounds = getLocalBounds();

    // Plugin status bar at bottom
    pluginStatus.setBounds(bounds.removeFromBottom(32));

    // Track status at top (taller now to fit session name)
    trackStatus.setBounds(bounds.removeFromTop(72).reduced(8, 4));

    bounds.removeFromTop(4); // spacing

    switch (currentTab)
    {
        case Sidebar::Projects:
        {
            // Sessions list + Comments side by side
            collabPanel.setVisible(false);
            versionsPanel.setVisible(false);
            sessionsPanel.setVisible(true);
            commentsPanel.setVisible(true);

            auto rightCol = bounds.removeFromRight(280);
            commentsPanel.setBounds(rightCol.reduced(4));
            sessionsPanel.setBounds(bounds.reduced(4));
            break;
        }
        case Sidebar::Comments:
        {
            collabPanel.setVisible(false);
            versionsPanel.setVisible(false);
            sessionsPanel.setVisible(false);
            commentsPanel.setVisible(true);
            commentsPanel.setBounds(bounds.reduced(4));
            break;
        }
        case Sidebar::Collaborators:
        {
            commentsPanel.setVisible(false);
            versionsPanel.setVisible(false);
            sessionsPanel.setVisible(false);
            collabPanel.setVisible(true);
            collabPanel.setBounds(bounds.reduced(4));
            break;
        }
        case Sidebar::Versions:
        {
            collabPanel.setVisible(false);
            commentsPanel.setVisible(false);
            sessionsPanel.setVisible(false);
            versionsPanel.setVisible(true);
            versionsPanel.setBounds(bounds.reduced(4));
            break;
        }
    }
}

void DashboardView::showTab(Sidebar::Tab tab)
{
    currentTab = tab;
    resized();
    repaint();
}
