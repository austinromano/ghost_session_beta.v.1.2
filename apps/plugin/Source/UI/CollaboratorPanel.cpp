#include "CollaboratorPanel.h"
#include "../Core/PluginProcessor.h"
#include "../Core/GhostLog.h"

CollaboratorPanel::CollaboratorPanel(GhostSessionProcessor& processor)
    : proc(processor)
{
    proc.getSessionManager().getSessionState().addListener(this);
}

CollaboratorPanel::~CollaboratorPanel()
{
    proc.getSessionManager().getSessionState().removeListener(this);
}

void CollaboratorPanel::paint(juce::Graphics& g)
{
    GhostLog::write("[CollabPanel] paint start");
    g.setColour(GhostColours::surface);
    g.fillRect(getLocalBounds());

    // Right border
    g.setColour(GhostColours::border);
    g.drawLine((float)getWidth() - 0.5f, 0, (float)getWidth() - 0.5f, (float)getHeight(), 1.0f);

    // Header
    g.setColour(GhostColours::textSecondary);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("COLLABORATORS (" + juce::String((int)collaborators.size()) + ")",
               12, 8, getWidth() - 24, 14, juce::Justification::centredLeft);

    // Draw each collaborator
    int y = 30;
    for (size_t i = 0; i < collaborators.size(); ++i)
    {
        auto& collab = collaborators[i];
        auto colour = collab.colour.isTransparent()
            ? GhostColours::collabColours[i % GhostColours::numCollabColours]
            : collab.colour;

        // Avatar circle
        float avatarX = 14.0f;
        float avatarY = (float)y + 4.0f;
        float avatarSize = 32.0f;

        g.setColour(colour.withAlpha(0.3f));
        g.fillEllipse(avatarX, avatarY, avatarSize, avatarSize);

        // Initial
        g.setColour(colour);
        g.setFont(juce::Font(14.0f, juce::Font::bold));
        g.drawText(collab.displayName.substring(0, 1).toUpperCase(),
                   (int)avatarX, (int)avatarY, (int)avatarSize, (int)avatarSize,
                   juce::Justification::centred);

        // Online indicator
        g.setColour(collab.isOnline ? GhostColours::onlineGreen : GhostColours::textMuted);
        g.fillEllipse(avatarX + avatarSize - 8, avatarY + avatarSize - 8, 8, 8);

        // Name
        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(13.0f, juce::Font::plain));
        g.drawText(collab.displayName, 54, y + 4, getWidth() - 66, 16,
                   juce::Justification::centredLeft);

        // Host badge
        if (collab.isHost)
        {
            g.setColour(GhostColours::hostGold);
            g.setFont(juce::Font(9.0f, juce::Font::bold));
            g.drawText("HOST", 54, y + 22, 40, 12, juce::Justification::centredLeft);
        }
        else
        {
            g.setColour(GhostColours::textMuted);
            g.setFont(juce::Font(10.0f, juce::Font::plain));
            g.drawText("connected", 54, y + 22, 80, 12, juce::Justification::centredLeft);
        }

        y += 48;
    }

    // Empty state
    if (collaborators.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::italic));
        g.drawText("Waiting for\ncollaborators...",
                   getLocalBounds().reduced(20), juce::Justification::centred);
    }
    GhostLog::write("[CollabPanel] paint done");
}

void CollaboratorPanel::resized() {}

void CollaboratorPanel::onCollaboratorJoined(const ProducerProfile&) { refresh(); }
void CollaboratorPanel::onCollaboratorLeft(const juce::String&)       { refresh(); }

void CollaboratorPanel::refresh()
{
    collaborators = proc.getSessionManager().getSessionState().getCollaborators();
    repaint();
}
