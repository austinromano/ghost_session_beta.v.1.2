#pragma once

#include "JuceHeader.h"

//==============================================================================
/**
 * AudioStreamCodec — Encoding/decoding for real-time audio streaming.
 *
 * In production this would wrap the Opus codec for ~128kbps stereo at
 * 48kHz with ~20ms latency. For the mockup, we use raw 16-bit PCM
 * with simple compression (delta encoding + zlib).
 *
 * Frame format:
 *   [4 bytes] magic: "GHAS"
 *   [2 bytes] channels
 *   [2 bytes] samples per channel
 *   [4 bytes] sample rate
 *   [4 bytes] compressed data size
 *   [N bytes] compressed interleaved 16-bit PCM
 */
class AudioStreamCodec
{
public:
    struct Frame
    {
        int channels = 2;
        int samplesPerChannel = 512;
        int sampleRate = 48000;
        juce::MemoryBlock data;
    };

    static Frame encode(const juce::AudioBuffer<float>& buffer, double sampleRate);
    static bool decode(const juce::MemoryBlock& encoded,
                       juce::AudioBuffer<float>& output,
                       double& sampleRate);

    // Estimate bandwidth usage
    static double estimateBitrateKbps(int sampleRate, int channels, int blockSize,
                                       double blocksPerSecond);
};
