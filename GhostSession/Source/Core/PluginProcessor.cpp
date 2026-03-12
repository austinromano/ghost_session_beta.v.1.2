#include "PluginProcessor.h"
#include "PluginEditor.h"

GhostSessionProcessor::GhostSessionProcessor()
    : AudioProcessor(BusesProperties()
                     .withInput("Input",  juce::AudioChannelSet::stereo(), true)
                     .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
}

bool GhostSessionProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet();
}

void GhostSessionProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                           juce::MidiBuffer&)
{
    // Pass-through — this plugin is a UI-only dashboard
    juce::ScopedNoDenormals noDenormals;
    auto totalIn  = getTotalNumInputChannels();
    auto totalOut = getTotalNumOutputChannels();
    for (auto i = totalIn; i < totalOut; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());
}

juce::AudioProcessorEditor* GhostSessionProcessor::createEditor()
{
    return new GhostSessionEditor(*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new GhostSessionProcessor();
}
