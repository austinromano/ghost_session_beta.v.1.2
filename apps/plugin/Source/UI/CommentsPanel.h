#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "../Core/GhostModels.h"

//==============================================================================
class CommentsPanel : public juce::Component
{
public:
    CommentsPanel();
    void paint(juce::Graphics&) override;
    void resized() override;

    void setComments(const std::vector<GhostComment>& comments);

    std::function<void(const juce::String& body, const juce::String& parentId)> onPostComment;

private:
    std::vector<GhostComment> comments;
    juce::TextEditor inputField;
    juce::TextButton sendButton { "Post" };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CommentsPanel)
};
