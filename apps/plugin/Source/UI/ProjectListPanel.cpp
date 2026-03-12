#include "ProjectListPanel.h"

ProjectListPanel::ProjectListPanel()
{
    createButton.onClick = [this] { if (onCreateClicked) onCreateClicked(); };
    addAndMakeVisible(createButton);
}

void ProjectListPanel::paint(juce::Graphics& g)
{
    g.setColour(GhostColours::surface);
    g.fillRect(getLocalBounds());

    // Right border
    g.setColour(GhostColours::border);
    g.drawLine((float)getWidth() - 0.5f, 0,
               (float)getWidth() - 0.5f, (float)getHeight(), 1.0f);

    // Logo + title
    g.setColour(GhostColours::ghostGreen);
    g.fillEllipse(16.0f, 14.0f, 24.0f, 24.0f);
    g.setColour(GhostColours::surface);
    g.fillEllipse(20.0f, 18.0f, 16.0f, 16.0f);
    g.setColour(GhostColours::ghostGreen);
    g.fillEllipse(24.0f, 22.0f, 8.0f, 8.0f);

    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(14.0f, juce::Font::bold));
    g.drawText("Ghost Session", 48, 14, getWidth() - 56, 24,
               juce::Justification::centredLeft);

    // Section label
    g.setColour(GhostColours::textMuted);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    g.drawText("PROJECTS", 16, 52, getWidth() - 32, 14,
               juce::Justification::centredLeft);

    // Project rows
    int y = 72;
    for (size_t i = 0; i < projects.size(); ++i)
    {
        auto& p = projects[i];
        auto rowBounds = juce::Rectangle<float>(4.0f, (float)y, (float)getWidth() - 8.0f, 44.0f);
        bool isSelected = (p.id == selectedId);

        if (isSelected)
        {
            g.setColour(GhostColours::surfaceLight);
            g.fillRoundedRectangle(rowBounds, 4.0f);
            g.setColour(GhostColours::ghostGreen);
            g.fillRect(rowBounds.getX(), rowBounds.getY() + 6, 3.0f, rowBounds.getHeight() - 12);
        }

        // Project name
        g.setColour(isSelected ? GhostColours::textPrimary : GhostColours::textSecondary);
        g.setFont(juce::Font(13.0f, isSelected ? juce::Font::bold : juce::Font::plain));
        g.drawText(p.name, 16, y + 6, getWidth() - 32, 16,
                   juce::Justification::centredLeft);

        // Tempo + Key
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(10.0f, juce::Font::plain));
        g.drawText(juce::String(p.tempo, 0) + " BPM  |  " + p.key,
                   16, y + 24, getWidth() - 32, 12,
                   juce::Justification::centredLeft);

        // Delete button (X) on the right
        auto delBounds = juce::Rectangle<float>((float)getWidth() - 28.0f, (float)y + 12.0f, 20.0f, 20.0f);
        g.setColour(GhostColours::textMuted.withAlpha(0.4f));
        g.setFont(juce::Font(12.0f, juce::Font::bold));
        g.drawText("X", delBounds.toNearestInt(), juce::Justification::centred);

        y += 48;
    }

    // Empty state
    if (projects.empty())
    {
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(12.0f, juce::Font::italic));
        g.drawText("No projects yet",
                   getLocalBounds().withTop(72).withBottom(getHeight() - 50),
                   juce::Justification::centred);
    }
}

void ProjectListPanel::resized()
{
    createButton.setBounds(8, getHeight() - 42, getWidth() - 16, 34);
}

void ProjectListPanel::mouseDown(const juce::MouseEvent& e)
{
    int row = getRowAt(e.y);
    if (row < 0) return;

    // Check if click is on the delete "X" button (right side)
    if (e.x >= getWidth() - 30 && onDeleteProject)
    {
        onDeleteProject(projects[(size_t)row]);
        return;
    }

    if (onProjectSelected)
    {
        selectedId = projects[(size_t)row].id;
        repaint();
        onProjectSelected(projects[(size_t)row]);
    }
}

void ProjectListPanel::setProjects(const std::vector<ProjectItem>& p)
{
    projects = p;
    repaint();
}

void ProjectListPanel::setSelectedId(const juce::String& id)
{
    selectedId = id;
    repaint();
}

int ProjectListPanel::getRowAt(int y) const
{
    int startY = 72;
    if (y < startY) return -1;
    int row = (y - startY) / 48;
    if (row >= 0 && row < (int)projects.size()) return row;
    return -1;
}
