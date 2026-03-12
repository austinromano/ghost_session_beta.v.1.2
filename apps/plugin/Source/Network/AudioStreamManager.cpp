#include "AudioStreamManager.h"

AudioStreamManager::AudioStreamManager(WebSocketConnection& ws)
    : webSocket(ws)
{
    webSocket.addListener(this);
}

AudioStreamManager::~AudioStreamManager()
{
    webSocket.removeListener(this);
}

void AudioStreamManager::prepare(double sr, int bs, int ch)
{
    sampleRate = sr;
    blockSize = bs;
    numChannels = ch;

    jitterBuffer.setSize(ch, kJitterBufferSize);
    jitterBuffer.clear();
    writePos.store(0);
    readPos.store(0);
}

void AudioStreamManager::releaseResources()
{
    jitterBuffer.setSize(0, 0);
}

//==============================================================================
void AudioStreamManager::sendAudio(const juce::String& sessionId,
                                    const juce::AudioBuffer<float>& buffer)
{
    if (!streaming.load()) return;

    auto encoded = encodeAudio(buffer);
    webSocket.sendAudioChunk(sessionId, encoded);
}

void AudioStreamManager::getReceivedAudio(juce::AudioBuffer<float>& outputBuffer)
{
    if (!streaming.load()) return;

    const juce::ScopedLock sl(bufferLock);

    int rp = readPos.load();
    int wp = writePos.load();

    // Calculate available samples in jitter buffer
    int available = (wp - rp + kJitterBufferSize) % kJitterBufferSize;
    int samplesToRead = juce::jmin(available, outputBuffer.getNumSamples());

    float vol = streamVolume.load();

    for (int s = 0; s < samplesToRead; ++s)
    {
        int idx = (rp + s) % kJitterBufferSize;
        for (int ch = 0; ch < juce::jmin(outputBuffer.getNumChannels(),
                                          jitterBuffer.getNumChannels()); ++ch)
        {
            outputBuffer.addSample(ch, s,
                jitterBuffer.getSample(ch, idx) * vol);
        }
    }

    readPos.store((rp + samplesToRead) % kJitterBufferSize);
}

//==============================================================================
void AudioStreamManager::onAudioChunkReceived(const juce::MemoryBlock& audioData)
{
    // Decode and write into jitter buffer
    juce::AudioBuffer<float> decoded(numChannels, blockSize);
    decoded.clear();
    decodeAudio(audioData, decoded);

    const juce::ScopedLock sl(bufferLock);

    int wp = writePos.load();
    int samplesToWrite = decoded.getNumSamples();

    for (int s = 0; s < samplesToWrite; ++s)
    {
        int idx = (wp + s) % kJitterBufferSize;
        for (int ch = 0; ch < juce::jmin(decoded.getNumChannels(),
                                          jitterBuffer.getNumChannels()); ++ch)
        {
            jitterBuffer.setSample(ch, idx, decoded.getSample(ch, s));
        }
    }

    writePos.store((wp + samplesToWrite) % kJitterBufferSize);
}

//==============================================================================
juce::MemoryBlock AudioStreamManager::encodeAudio(const juce::AudioBuffer<float>& buffer)
{
    // PLACEHOLDER: In production, use Opus codec for ~128kbps stereo
    // For now: raw 16-bit PCM interleaved
    int numSamples = buffer.getNumSamples();
    int numCh = buffer.getNumChannels();

    juce::MemoryBlock block(static_cast<size_t>(numSamples * numCh * sizeof(int16_t)));
    auto* dest = static_cast<int16_t*>(block.getData());

    for (int s = 0; s < numSamples; ++s)
    {
        for (int ch = 0; ch < numCh; ++ch)
        {
            float sample = juce::jlimit(-1.0f, 1.0f, buffer.getSample(ch, s));
            *dest++ = static_cast<int16_t>(sample * 32767.0f);
        }
    }

    return block;
}

void AudioStreamManager::decodeAudio(const juce::MemoryBlock& data,
                                      juce::AudioBuffer<float>& output)
{
    // PLACEHOLDER: Decode raw 16-bit PCM interleaved
    int numCh = output.getNumChannels();
    int numSamples = output.getNumSamples();

    auto* src = static_cast<const int16_t*>(data.getData());
    int totalSamples = (int)(data.getSize() / sizeof(int16_t));

    for (int s = 0; s < numSamples && (s * numCh + numCh - 1) < totalSamples; ++s)
    {
        for (int ch = 0; ch < numCh; ++ch)
        {
            output.setSample(ch, s, (float)src[s * numCh + ch] / 32767.0f);
        }
    }
}
