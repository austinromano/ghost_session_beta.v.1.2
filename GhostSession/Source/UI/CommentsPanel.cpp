#include "CommentsPanel.h"

CommentsPanel::CommentsPanel()
{
    inputField.setTextToShowWhenEmpty("Add a comment...", GhostColours::textMuted);
    inputField.setReturnKeyStartsNewLine(false);
    inputField.onReturnKey = [this] {
        auto text = inputField.getText().trim();
        if (text.isNotEmpty() && onPostComment)
        {
            onPostComment(text, {});
            inputField.clear();
        }
    };
    addAndMakeVisible(inputField);

    sendButton.onClick = [this] {
        auto text = inputField.getText().trim();
        if (text.isNotEmpty() && onPostComment)
        {
            onPostComment(text, {});
            inputField.clear();
        }
    };
    addAndMakeVisible(sendButton);
}

void CommentsPanel::paint(juce::Graphics& g)
{
    // Title
    g.setColour(GhostColours::textPrimary);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("Comments", 12, 8, getWidth() - 24, 18, juce::Justification::centredLeft);

    // Draw comments
    int y = 36;
    for (auto& c : comments)
    {
        if (y > getHeight() - 50) break; // don't overflow into input area

        int indent = c.parentId.isNotEmpty() ? 24 : 0;

        // Avatar circle
        auto col = GhostColours::collabColours[
            (unsigned)std::abs(c.authorName.hashCode()) % GhostColours::numCollabColours];
        g.setColour(col.withAlpha(0.3f));
        g.fillEllipse((float)(8 + indent), (float)y, 26.0f, 26.0f);
        g.setColour(col);
        g.setFont(juce::Font(11.0f, juce::Font::bold));
        g.drawText(c.authorName.substring(0, 1).toUpperCase(),
                   8 + indent, y, 26, 26, juce::Justification::centred);

        // Author + time
        g.setColour(GhostColours::textPrimary);
        g.setFont(juce::Font(12.0f, juce::Font::bold));
        g.drawText(c.authorName, 40 + indent, y, 120, 14,
                   juce::Justification::centredLeft);

        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(10.0f, juce::Font::plain));
        g.drawText(c.createdAt, 40 + indent, y + 14, 100, 12,
                   juce::Justification::centredLeft);

        // Reply button
        g.setColour(GhostColours::textMuted);
        g.setFont(juce::Font(10.0f, juce::Font::plain));
        g.drawText("Reply", getWidth() - 60, y, 48, 14,
                   juce::Justification::centredRight);

        // Body
        g.setColour(GhostColours::textSecondary);
        g.setFont(juce::Font(12.0f, juce::Font::plain));
        g.drawText(c.body, 40 + indent, y + 28, getWidth() - 56 - indent, 18,
                   juce::Justification::centredLeft);

        y += 56;
    }
}

void CommentsPanel::resized()
{
    auto bounds = getLocalBounds();
    auto inputArea = bounds.removeFromBottom(36);
    sendButton.setBounds(inputArea.removeFromRight(52).reduced(2));
    inputField.setBounds(inputArea.reduced(2));
}

void CommentsPanel::setComments(const std::vector<GhostComment>& newComments)
{
    comments = newComments;
    repaint();
}
