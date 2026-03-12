#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "GhostLog.h"

GhostSessionProcessor::GhostSessionProcessor()
    : AudioProcessor(BusesProperties()
                     .withInput("Input",  juce::AudioChannelSet::stereo(), true)
                     .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    formatManager.registerBasicFormats();
    readAheadThread.startThread(juce::Thread::Priority::normal);
}

GhostSessionProcessor::~GhostSessionProcessor()
{
    transportSource.setSource(nullptr);
    if (standalonePlayerReady)
    {
        playerDeviceManager.removeAudioCallback(&sourcePlayer);
        sourcePlayer.setSource(nullptr);
    }
    readAheadThread.stopThread(2000);
}

bool GhostSessionProcessor::isRunningAsPlugin() const
{
    // If the host has called prepareToPlay, we're running as a plugin
    return pluginPrepared;
}

bool GhostSessionProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet();
}

void GhostSessionProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    pluginPrepared = true;
    hostSampleRate = sampleRate;
    hostBlockSize = samplesPerBlock;

    // Prepare transport for plugin-mode playback through processBlock
    transportSource.prepareToPlay(samplesPerBlock, sampleRate);

    GhostLog::write("[Player] prepareToPlay: sr=" + juce::String(sampleRate)
                    + " bs=" + juce::String(samplesPerBlock));
}

void GhostSessionProcessor::releaseResources()
{
    transportSource.releaseResources();
}

void GhostSessionProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                           juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalIn  = getTotalNumInputChannels();
    auto totalOut = getTotalNumOutputChannels();

    // Clear unused output channels
    for (auto i = totalIn; i < totalOut; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // In plugin mode, mix transport audio into the output buffer
    if (pluginPrepared && transportSource.isPlaying())
    {
        // Create an AudioSourceChannelInfo to read from the transport
        juce::AudioSourceChannelInfo info(&buffer, 0, buffer.getNumSamples());
        transportSource.getNextAudioBlock(info);
    }
}

juce::AudioProcessorEditor* GhostSessionProcessor::createEditor()
{
    return new GhostSessionEditor(*this);
}

void GhostSessionProcessor::ensureStandaloneReady()
{
    if (standalonePlayerReady || pluginPrepared) return;

    GhostLog::write("[Player] Initialising standalone audio device...");

    auto err = playerDeviceManager.initialiseWithDefaultDevices(0, 2);
    if (err.isNotEmpty())
    {
        GhostLog::write("[Player] Device error: " + err);
        return;
    }

    sourcePlayer.setSource(&transportSource);
    playerDeviceManager.addAudioCallback(&sourcePlayer);
    standalonePlayerReady = true;

    auto* device = playerDeviceManager.getCurrentAudioDevice();
    if (device != nullptr)
    {
        GhostLog::write("[Player] Device: " + device->getName()
                        + " SR=" + juce::String(device->getCurrentSampleRate())
                        + " BS=" + juce::String(device->getCurrentBufferSizeSamples()));
    }
}

void GhostSessionProcessor::loadAndPlay(const juce::File& file)
{
    GhostLog::write("[Player] loadAndPlay: " + file.getFullPathName());

    // In standalone mode, set up our own audio device
    if (!pluginPrepared)
    {
        ensureStandaloneReady();
        if (!standalonePlayerReady)
        {
            GhostLog::write("[Player] Device not ready, cannot play");
            return;
        }
    }

    transportSource.stop();
    transportSource.setSource(nullptr);
    readerSource = nullptr;

    auto* reader = formatManager.createReaderFor(file);
    if (reader == nullptr)
    {
        GhostLog::write("[Player] Could not create reader for file");
        return;
    }

    GhostLog::write("[Player] Reader created: channels=" + juce::String((int)reader->numChannels)
                    + " sr=" + juce::String(reader->sampleRate)
                    + " length=" + juce::String(reader->lengthInSamples));

    readerSource = std::make_unique<juce::AudioFormatReaderSource>(reader, true);
    transportSource.setSource(readerSource.get(), 32768, &readAheadThread, reader->sampleRate);

    // In plugin mode, prepare at host sample rate
    if (pluginPrepared)
        transportSource.prepareToPlay(hostBlockSize, hostSampleRate);

    transportSource.setPosition(0.0);
    transportSource.start();

    GhostLog::write("[Player] Playing: " + juce::String(transportSource.isPlaying() ? "yes" : "no"));
}

void GhostSessionProcessor::stopPlayback()
{
    transportSource.stop();
    transportSource.setPosition(0.0);
}

bool GhostSessionProcessor::isPlaying() const
{
    return transportSource.isPlaying();
}

double GhostSessionProcessor::getPlaybackPosition() const
{
    double len = transportSource.getLengthInSeconds();
    if (len <= 0.0) return 0.0;
    return transportSource.getCurrentPosition() / len;
}

double GhostSessionProcessor::getPlaybackLengthSeconds() const
{
    return transportSource.getLengthInSeconds();
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new GhostSessionProcessor();
}
