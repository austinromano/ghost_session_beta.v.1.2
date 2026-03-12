#pragma once

#include "JuceHeader.h"
#include "../Core/AppState.h"
#include "../Network/LocalClient.h"
#include "../Network/WebSocketConnection.h"
#include "../Network/ApiClient.h"
#include "../Session/SessionManager.h"

//==============================================================================
class GhostSessionProcessor : public juce::AudioProcessor
{
public:
    GhostSessionProcessor();
    ~GhostSessionProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override  { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override    { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}

    LocalClient& getClient() { return client; }
    AppState& getAppState() { return appState; }
    SessionManager& getSessionManager() { return sessionManager; }

    // Audio playback
    void loadAndPlay(const juce::File& file);
    void stopPlayback();
    bool isPlaying() const;
    double getPlaybackPosition() const;
    double getPlaybackLengthSeconds() const;

private:
    AppState appState;
    LocalClient client;
    WebSocketConnection webSocket { appState };
    ApiClient apiClient { appState };
    SessionManager sessionManager { appState, webSocket, apiClient };

    // Audio player
    juce::AudioFormatManager formatManager;
    juce::TimeSliceThread readAheadThread { "audio-read-ahead" };
    juce::AudioTransportSource transportSource;
    std::unique_ptr<juce::AudioFormatReaderSource> readerSource;

    // Standalone-only: own audio device
    juce::AudioSourcePlayer sourcePlayer;
    juce::AudioDeviceManager playerDeviceManager;
    bool standalonePlayerReady = false;

    // Plugin mode: track if host has called prepareToPlay
    bool pluginPrepared = false;
    double hostSampleRate = 44100.0;
    int hostBlockSize = 512;

    bool isRunningAsPlugin() const;
    void ensureStandaloneReady();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GhostSessionProcessor)
};
