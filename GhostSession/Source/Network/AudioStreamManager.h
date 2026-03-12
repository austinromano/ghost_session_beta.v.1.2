#pragma once

#include "JuceHeader.h"
#include "WebSocketConnection.h"

//==============================================================================
/**
 * AudioStreamManager — Real-time audio streaming between collaborators.
 *
 * When a session is playing, the host streams the mixed audio to all
 * participants so everyone hears the same thing in real time.
 *
 * Architecture:
 *   - Host captures processBlock output → encodes → sends via WebSocket
 *   - Clients receive → decode → mix into their local output
 *   - Jitter buffer smooths out network timing variations
 *   - Opus codec for low-latency compression (placeholder: raw PCM)
 *
 * This is what makes Ghost Session feel "live" — everyone hears the
 * beat playing at the same time.
 */
class AudioStreamManager : public WebSocketConnection::Listener
{
public:
    AudioStreamManager(WebSocketConnection& ws);
    ~AudioStreamManager() override;

    void prepare(double sampleRate, int blockSize, int channels);
    void releaseResources();

    //==============================================================================
    // Host: encode and send audio
    void sendAudio(const juce::String& sessionId,
                   const juce::AudioBuffer<float>& buffer);

    // Client: get received audio to mix into output
    void getReceivedAudio(juce::AudioBuffer<float>& outputBuffer);

    //==============================================================================
    // Enable/disable streaming
    void setStreaming(bool enabled) { streaming.store(enabled); }
    bool isStreaming() const { return streaming.load(); }

    // Volume for received stream
    void setStreamVolume(float vol) { streamVolume.store(juce::jlimit(0.0f, 1.0f, vol)); }

    //==============================================================================
    // WebSocketConnection::Listener
    void onAudioChunkReceived(const juce::MemoryBlock& audioData) override;

private:
    WebSocketConnection& webSocket;

    std::atomic<bool> streaming { false };
    std::atomic<float> streamVolume { 0.8f };

    double sampleRate = 44100.0;
    int blockSize = 512;
    int numChannels = 2;

    // Jitter buffer — ring buffer of decoded audio chunks
    static constexpr int kJitterBufferSize = 8192;
    juce::AudioBuffer<float> jitterBuffer;
    std::atomic<int> writePos { 0 };
    std::atomic<int> readPos { 0 };
    juce::CriticalSection bufferLock;

    // Encoding helpers (placeholder for Opus codec)
    juce::MemoryBlock encodeAudio(const juce::AudioBuffer<float>& buffer);
    void decodeAudio(const juce::MemoryBlock& data, juce::AudioBuffer<float>& output);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioStreamManager)
};
