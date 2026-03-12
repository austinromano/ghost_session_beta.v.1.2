#pragma once

#include "JuceHeader.h"

//==============================================================================
namespace GhostColours
{
    // Backgrounds
    static const juce::Colour background       (0xFF1A1A2E);
    static const juce::Colour surface          (0xFF16213E);
    static const juce::Colour surfaceLight     (0xFF1E2A4A);
    static const juce::Colour surfaceHover     (0xFF253355);
    static const juce::Colour border           (0xFF2A2A4A);

    // Ghost accent — spectral green/cyan
    static const juce::Colour ghostGreen       (0xFF00FFC8);
    static const juce::Colour ghostCyan        (0xFF00E5FF);
    static const juce::Colour ghostPurple      (0xFF8B5CF6);

    // Status
    static const juce::Colour onlineGreen      (0xFF00E676);
    static const juce::Colour warningAmber     (0xFFFFB74D);
    static const juce::Colour errorRed         (0xFFFF5252);
    static const juce::Colour hostGold         (0xFFFFD700);

    // Text
    static const juce::Colour textPrimary      (0xFFEEEEF5);
    static const juce::Colour textSecondary    (0xFF8888A0);
    static const juce::Colour textMuted        (0xFF555570);

    // Track status colours
    static const juce::Colour editableGreen    (0xFF4CAF50);
    static const juce::Colour missingAmber     (0xFFFF9800);
    static const juce::Colour renderedBlue     (0xFF42A5F5);

    // Track type colours
    static const juce::Colour audioTrack       (0xFF42A5F5);
    static const juce::Colour midiTrack        (0xFF8B5CF6);
    static const juce::Colour drumTrack        (0xFFFF6B6B);
    static const juce::Colour loopTrack        (0xFF4ECDC4);

    // Waveform display
    static const juce::Colour waveformBg       (0xFF0D1117);
    static const juce::Colour waveformFill     (0xFF00FFC8);
    static const juce::Colour accentGradStart  (0xFF00FFC8);
    static const juce::Colour accentGradEnd    (0xFF8B5CF6);
    static const juce::Colour playhead         (0xFFFFFFFF);

    // Collaborator colours
    static const juce::Colour collabColours[] = {
        juce::Colour(0xFF00FFC8), juce::Colour(0xFF8B5CF6), juce::Colour(0xFFFF6B6B),
        juce::Colour(0xFF4ECDC4), juce::Colour(0xFFFFD93D), juce::Colour(0xFFFF8A5C),
        juce::Colour(0xFF6C5CE7), juce::Colour(0xFFE056C1)
    };
    static constexpr int numCollabColours = 8;
}

//==============================================================================
class GhostTheme : public juce::LookAndFeel_V4
{
public:
    GhostTheme();

    void drawButtonBackground(juce::Graphics&, juce::Button&,
                              const juce::Colour&, bool, bool) override;
    void drawButtonText(juce::Graphics&, juce::TextButton&, bool, bool) override;
    void drawScrollbar(juce::Graphics&, juce::ScrollBar&,
                       int, int, int, int, bool, int, int, bool, bool) override;
    void fillTextEditorBackground(juce::Graphics&, int, int, juce::TextEditor&) override;
    void drawTextEditorOutline(juce::Graphics&, int, int, juce::TextEditor&) override;
};
