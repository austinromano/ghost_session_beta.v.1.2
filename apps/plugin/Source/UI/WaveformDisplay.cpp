#include "WaveformDisplay.h"

WaveformDisplay::WaveformDisplay()
{
    formatManager.registerBasicFormats();
    thumbnail = std::make_unique<juce::AudioThumbnail>(512, formatManager, thumbnailCache);
    thumbnail->addChangeListener(this);
}

WaveformDisplay::~WaveformDisplay()
{
    thumbnail->removeChangeListener(this);
}

void WaveformDisplay::setThumbnailData(const std::vector<float>& p)
{
    peaks = p;
    useFullThumbnail = false;
    repaint();
}

void WaveformDisplay::setAudioFile(const juce::File& file)
{
    thumbnail->clear();
    useFullThumbnail = true;
    if (file.existsAsFile())
        thumbnail->setSource(new juce::FileInputSource(file));
    repaint();
}

void WaveformDisplay::setPlaybackPosition(double pos)
{
    playbackPosition = juce::jlimit(0.0, 1.0, pos);
    repaint();
}

void WaveformDisplay::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();
    g.setColour(GhostColours::waveformBg);
    g.fillRoundedRectangle(bounds, 3.0f);

    float w = bounds.getWidth();
    float h = bounds.getHeight();
    float midY = bounds.getCentreY();

    if (useFullThumbnail && thumbnail->getTotalLength() > 0)
    {
        g.setColour(GhostColours::waveformFill);
        thumbnail->drawChannels(g, bounds.toNearestInt(),
                                0.0, thumbnail->getTotalLength(), 1.0f);
    }
    else if (!peaks.empty())
    {
        int numPeaks = (int)peaks.size();
        float barW = w / (float)numPeaks;

        for (int i = 0; i < numPeaks; ++i)
        {
            float x = bounds.getX() + (float)i * barW;
            float peakH = std::abs(peaks[(size_t)i]) * (h * 0.42f);
            float t = (float)i / (float)numPeaks;

            auto col = GhostColours::accentGradStart.interpolatedWith(
                GhostColours::accentGradEnd, t);
            if (t <= playbackPosition)
                col = col.brighter(0.3f);

            g.setColour(col);
            g.fillRect(x + 0.5f, midY - peakH, barW - 1.0f, peakH * 2.0f);
        }
    }

    if (playbackPosition > 0.0)
    {
        float px = bounds.getX() + (float)playbackPosition * w;
        g.setColour(GhostColours::playhead);
        g.drawLine(px, bounds.getY(), px, bounds.getBottom(), 1.5f);
    }
}

void WaveformDisplay::mouseDown(const juce::MouseEvent& e)
{
    isDragging = false;
    if (!interactive) return;
    double pos = (double)e.x / (double)getWidth();
    setPlaybackPosition(pos);
    if (onScrub) onScrub(pos);
}

void WaveformDisplay::mouseDrag(const juce::MouseEvent& e)
{
    // External file drag
    if (!isDragging && draggableFile.existsAsFile() && e.getDistanceFromDragStart() > 5)
    {
        isDragging = true;
        juce::StringArray files;
        files.add(draggableFile.getFullPathName());
        juce::DragAndDropContainer::performExternalDragDropOfFiles(files, false);
        return;
    }

    if (!interactive || isDragging) return;
    double pos = juce::jlimit(0.0, 1.0, (double)e.x / (double)getWidth());
    setPlaybackPosition(pos);
    if (onScrub) onScrub(pos);
}

void WaveformDisplay::mouseUp(const juce::MouseEvent&)
{
    isDragging = false;
}

void WaveformDisplay::changeListenerCallback(juce::ChangeBroadcaster*) { repaint(); }
