#pragma once

#include "JuceHeader.h"
#include "GhostTheme.h"
#include "../Session/SessionState.h"

class GhostSessionProcessor;

//==============================================================================
/**
 * Left panel — Shows all collaborators in the session.
 *
 * Each entry:
 *   - Colour-coded avatar
 *   - Producer name
 *   - Host badge (crown icon)
 *   - Online status
 *   - Current activity indicator (e.g., "editing Track 2")
 */
class CollaboratorPanel : public juce::Component,
                          public SessionState::Listener
{
public:
    explicit CollaboratorPanel(GhostSessionProcessor& processor);
    ~CollaboratorPanel() override;

    void paint(juce::Graphics&) override;
    void resized() override;

    // SessionState::Listener
    void onCollaboratorJoined(const ProducerProfile& producer) override;
    void onCollaboratorLeft(const juce::String& userId) override;

private:
    GhostSessionProcessor& proc;
    std::vector<ProducerProfile> collaborators;

    void refresh();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CollaboratorPanel)
};
