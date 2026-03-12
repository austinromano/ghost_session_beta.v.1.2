#include "JuceHeader.h"
#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <fstream>

static void appLog(const std::string& msg)
{
    std::ofstream f("C:\\Users\\austi\\ghost_debug.log", std::ios::app);
    f << msg << std::endl;
    f.flush();
}

class GhostStandaloneApp : public juce::JUCEApplication
{
public:
    const juce::String getApplicationName() override    { return "Ghost Session"; }
    const juce::String getApplicationVersion() override { return "2.0.0"; }

    void initialise(const juce::String&) override
    {
        appLog("initialise: start");
        try
        {
            processor = std::make_unique<GhostSessionProcessor>();
            appLog("initialise: processor created");
            mainWindow = std::make_unique<MainWindow>(*processor);
            appLog("initialise: window created");
        }
        catch (const std::exception& e)
        {
            appLog(std::string("initialise EXCEPTION: ") + e.what());
            quit();
        }
        catch (...)
        {
            appLog("initialise UNKNOWN EXCEPTION");
            quit();
        }
    }

    void unhandledException(const std::exception* e, const juce::String& sourceFile, int lineNumber) override
    {
        appLog("UNHANDLED EXCEPTION in " + sourceFile.toStdString() + ":" + std::to_string(lineNumber)
               + " - " + (e ? e->what() : "unknown"));
    }

    void shutdown() override
    {
        appLog("shutdown called");
        mainWindow = nullptr;
        processor = nullptr;
    }

    class MainWindow : public juce::DocumentWindow
    {
    public:
        MainWindow(GhostSessionProcessor& proc)
            : DocumentWindow("Ghost Session",
                             juce::Colour(0xFF1A1A2E),
                             DocumentWindow::allButtons)
        {
            setContentOwned(proc.createEditor(), true);
            setResizable(true, true);
            centreWithSize(getWidth(), getHeight());
            setUsingNativeTitleBar(true);
            setVisible(true);
        }

        void closeButtonPressed() override
        {
            juce::JUCEApplication::getInstance()->systemRequestedQuit();
        }
    };

private:
    std::unique_ptr<GhostSessionProcessor> processor;
    std::unique_ptr<MainWindow> mainWindow;
};

JUCE_CREATE_APPLICATION_DEFINE(GhostStandaloneApp)
