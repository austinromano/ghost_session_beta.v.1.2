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
    ~GhostSessionProcessor() override = default;

    void prepareToPlay(double, int) override {}
    void releaseResources() override {}
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

private:
    AppState appState;
    LocalClient client;
    WebSocketConnection webSocket { appState };
    ApiClient apiClient { appState };
    SessionManager sessionManager { appState, webSocket, apiClient };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GhostSessionProcessor)
};
