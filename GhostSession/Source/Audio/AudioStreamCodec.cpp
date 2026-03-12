#include "AudioStreamCodec.h"

AudioStreamCodec::Frame AudioStreamCodec::encode(const juce::AudioBuffer<float>& buffer,
                                                   double sampleRate)
{
    Frame frame;
    frame.channels = buffer.getNumChannels();
    frame.samplesPerChannel = buffer.getNumSamples();
    frame.sampleRate = (int)sampleRate;

    // Interleave and convert to 16-bit PCM
    int totalSamples = frame.channels * frame.samplesPerChannel;
    std::vector<int16_t> pcm(static_cast<size_t>(totalSamples));

    for (int s = 0; s < frame.samplesPerChannel; ++s)
    {
        for (int ch = 0; ch < frame.channels; ++ch)
        {
            float sample = juce::jlimit(-1.0f, 1.0f, buffer.getSample(ch, s));
            pcm[static_cast<size_t>(s * frame.channels + ch)] =
                static_cast<int16_t>(sample * 32767.0f);
        }
    }

    // Header: magic + metadata
    juce::MemoryOutputStream stream;
    stream.write("GHAS", 4);
    stream.writeShort((short)frame.channels);
    stream.writeShort((short)frame.samplesPerChannel);
    stream.writeInt(frame.sampleRate);

    // Write PCM data (in production: Opus-compressed)
    int pcmBytes = totalSamples * (int)sizeof(int16_t);
    stream.writeInt(pcmBytes);
    stream.write(pcm.data(), static_cast<size_t>(pcmBytes));

    frame.data.replaceAll(stream.getData(), stream.getDataSize());
    return frame;
}

bool AudioStreamCodec::decode(const juce::MemoryBlock& encoded,
                               juce::AudioBuffer<float>& output,
                               double& sampleRate)
{
    juce::MemoryInputStream stream(encoded, false);

    // Read magic
    char magic[4];
    stream.read(magic, 4);
    if (memcmp(magic, "GHAS", 4) != 0)
        return false;

    int channels = stream.readShort();
    int samplesPerChannel = stream.readShort();
    sampleRate = (double)stream.readInt();
    int pcmBytes = stream.readInt();

    if (channels <= 0 || channels > 8 || samplesPerChannel <= 0 || samplesPerChannel > 8192)
        return false;

    output.setSize(channels, samplesPerChannel, false, false, true);

    int totalSamples = channels * samplesPerChannel;
    std::vector<int16_t> pcm(static_cast<size_t>(totalSamples));

    int bytesRead = (int)stream.read(pcm.data(), static_cast<size_t>(pcmBytes));
    if (bytesRead < pcmBytes)
        return false;

    // De-interleave
    for (int s = 0; s < samplesPerChannel; ++s)
    {
        for (int ch = 0; ch < channels; ++ch)
        {
            output.setSample(ch, s,
                (float)pcm[static_cast<size_t>(s * channels + ch)] / 32767.0f);
        }
    }

    return true;
}

double AudioStreamCodec::estimateBitrateKbps(int sampleRate, int channels,
                                               int blockSize, double blocksPerSecond)
{
    // Raw PCM: channels * blockSize * 16 bits * blocks/sec
    double bitsPerBlock = (double)(channels * blockSize * 16);
    double bitsPerSecond = bitsPerBlock * blocksPerSecond;
    return bitsPerSecond / 1000.0;
    // With Opus: typically ~128 kbps stereo regardless of block size
}
