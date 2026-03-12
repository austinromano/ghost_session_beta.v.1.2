#include "SessionLobby.h"

SessionLobby::SessionLobby()
{
    // Title
    titleLabel.setText("Ghost Session", juce::dontSendNotification);
    titleLabel.setFont(juce::Font(36.0f, juce::Font::bold));
    titleLabel.setColour(juce::Label::textColourId, GhostColours::ghostGreen);
    titleLabel.setJustificationType(juce::Justification::centred);
    addAndMakeVisible(titleLabel);

    subtitleLabel.setText("Live collaborative production inside your DAW",
                          juce::dontSendNotification);
    subtitleLabel.setFont(juce::Font(14.0f, juce::Font::plain));
    subtitleLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    subtitleLabel.setJustificationType(juce::Justification::centred);
    addAndMakeVisible(subtitleLabel);

    // Start session controls
    nameLabel.setText("Session Name", juce::dontSendNotification);
    nameLabel.setFont(juce::Font(11.0f, juce::Font::plain));
    nameLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    addAndMakeVisible(nameLabel);

    sessionNameField.setTextToShowWhenEmpty("My Beat Session", GhostColours::textMuted);
    addAndMakeVisible(sessionNameField);

    tempoLabel.setText("BPM", juce::dontSendNotification);
    tempoLabel.setFont(juce::Font(11.0f, juce::Font::plain));
    tempoLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    addAndMakeVisible(tempoLabel);

    tempoField.setTextToShowWhenEmpty("140", GhostColours::textMuted);
    tempoField.setInputRestrictions(5, "0123456789.");
    addAndMakeVisible(tempoField);

    keyLabel.setText("Key", juce::dontSendNotification);
    keyLabel.setFont(juce::Font(11.0f, juce::Font::plain));
    keyLabel.setColour(juce::Label::textColourId, GhostColours::textSecondary);
    addAndMakeVisible(keyLabel);

    // Key selector
    int id = 1;
    for (auto note : { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" })
    {
        keySelector.addItem(juce::String(note) + " Major", id++);
        keySelector.addItem(juce::String(note) + "m", id++);
    }
    keySelector.setSelectedId(1, juce::dontSendNotification);
    addAndMakeVisible(keySelector);

    // Start button — big, prominent
    startButton.onClick = [this] {
        auto name = sessionNameField.getText().trim();
        if (name.isEmpty()) name = "Untitled Session";

        auto tempoStr = tempoField.getText().trim();
        double tempo = tempoStr.isEmpty() ? 140.0 : tempoStr.getDoubleValue();
        tempo = juce::jlimit(30.0, 300.0, tempo);

        auto key = keySelector.getText();

        if (onStartSession)
            onStartSession(name, tempo, key);
    };
    addAndMakeVisible(startButton);

    // Or divider
    orLabel.setText("or", juce::dontSendNotification);
    orLabel.setFont(juce::Font(12.0f, juce::Font::plain));
    orLabel.setColour(juce::Label::textColourId, GhostColours::textMuted);
    orLabel.setJustificationType(juce::Justification::centred);
    addAndMakeVisible(orLabel);

    // Join session
    sessionCodeField.setTextToShowWhenEmpty("Enter session code...", GhostColours::textMuted);
    sessionCodeField.setJustification(juce::Justification::centred);
    addAndMakeVisible(sessionCodeField);

    joinButton.onClick = [this] {
        auto code = sessionCodeField.getText().trim();
        if (code.isNotEmpty() && onJoinSession)
            onJoinSession(code);
    };
    addAndMakeVisible(joinButton);
}

//==============================================================================
void SessionLobby::paint(juce::Graphics& g)
{
    g.fillAll(GhostColours::background);

    // Subtle ghost glow in center
    auto center = getLocalBounds().getCentre().toFloat();
    juce::ColourGradient glow(
        GhostColours::ghostGreen.withAlpha(0.05f), center.x, center.y - 100,
        GhostColours::background, center.x, center.y + 300,
        true);
    g.setGradientFill(glow);
    g.fillRect(getLocalBounds());

    // Version indicator — drawn LAST so it's on top, bright green so it's visible
    g.setColour(GhostColours::ghostGreen);
    g.setFont(14.0f);
    g.drawText("v0.2-debug", 10, getHeight() - 30, 200, 20,
               juce::Justification::centredLeft);

    // Invitations section
    if (!invitations.empty())
    {
        int y = getHeight() - 120;
        g.setColour(GhostColours::textSecondary);
        g.setFont(juce::Font(11.0f, juce::Font::bold));
        g.drawText("PENDING INVITATIONS", 40, y, getWidth() - 80, 16,
                   juce::Justification::centred);

        y += 20;
        g.setFont(juce::Font(12.0f, juce::Font::plain));
        for (auto& inv : invitations)
        {
            g.setColour(GhostColours::hostGold);
            g.drawText(inv.hostName + " invited you — Code: " + inv.sessionCode,
                       40, y, getWidth() - 80, 20, juce::Justification::centred);
            y += 22;
        }
    }
}

void SessionLobby::resized()
{
    auto bounds = getLocalBounds();
    int cx = bounds.getCentreX();
    int w = 320;
    int startY = bounds.getCentreY() - 200;

    // Title
    titleLabel.setBounds(cx - 200, startY, 400, 44);
    subtitleLabel.setBounds(cx - 200, startY + 48, 400, 20);

    int y = startY + 90;

    // Session name
    nameLabel.setBounds(cx - w/2, y, w, 16);
    y += 18;
    sessionNameField.setBounds(cx - w/2, y, w, 32);
    y += 40;

    // Tempo + Key row
    tempoLabel.setBounds(cx - w/2, y, 80, 16);
    keyLabel.setBounds(cx - w/2 + 100, y, 80, 16);
    y += 18;
    tempoField.setBounds(cx - w/2, y, 88, 32);
    keySelector.setBounds(cx - w/2 + 100, y, w - 100, 32);
    y += 44;

    // Start Session button
    startButton.setBounds(cx - w/2, y, w, 42);
    y += 54;

    // Or
    orLabel.setBounds(cx - 20, y, 40, 20);
    y += 30;

    // Join session
    sessionCodeField.setBounds(cx - w/2, y, w - 90, 36);
    joinButton.setBounds(cx + w/2 - 80, y, 80, 36);
}

void SessionLobby::addInvitation(const juce::String& sessionCode, const juce::String& hostName)
{
    invitations.push_back({ sessionCode, hostName });
    repaint();
}
