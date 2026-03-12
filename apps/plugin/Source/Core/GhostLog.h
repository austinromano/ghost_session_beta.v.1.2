#pragma once

#include "JuceHeader.h"

// Simple file logger for debugging plugin crashes
namespace GhostLog
{
    inline void write(const juce::String& msg)
    {
        auto logFile = juce::File::getSpecialLocation(juce::File::userDesktopDirectory)
                           .getChildFile("GhostSession.log");
        logFile.appendText(juce::Time::getCurrentTime().toString(true, true, true, true)
                           + "  " + msg + "\n");
    }
}
