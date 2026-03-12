cmake_minimum_required(VERSION 3.22)

project(GhostSession VERSION 2.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Use local JUCE clone
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../JUCE JUCE)

#==============================================================================
# Plugin Target
juce_add_plugin(GhostSession
    COMPANY_NAME                "Ghost Audio"
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            FALSE
    NEEDS_MIDI_OUTPUT           FALSE
    IS_MIDI_EFFECT              FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    PLUGIN_MANUFACTURER_CODE    GhAu
    PLUGIN_CODE                 GhSe
    FORMATS                     VST3 AU Standalone
    PRODUCT_NAME                "Ghost Session"
    BUNDLE_ID                   "com.ghostaudio.ghostsession"
    COPY_PLUGIN_AFTER_BUILD     TRUE
)

#==============================================================================
# Source Files
target_sources(GhostSession PRIVATE
    # Core
    Source/Core/PluginProcessor.cpp
    Source/Core/PluginEditor.cpp
    Source/Core/AppState.cpp

    # Auth
    Source/Auth/AuthManager.cpp

    # Session
    Source/Session/SessionManager.cpp
    Source/Session/SessionState.cpp
    Source/Session/SharedTransport.cpp

    # Network
    Source/Network/LocalClient.cpp
    Source/Network/ApiClient.cpp
    Source/Network/AudioStreamManager.cpp
    Source/Network/WebSocketConnection.cpp

    # Audio
    Source/Audio/AudioEngine.cpp
    Source/Audio/AudioStreamCodec.cpp
    Source/Audio/MidiCollaborator.cpp

    # UI
    Source/UI/GhostTheme.cpp
    Source/UI/Sidebar.cpp
    Source/UI/HeaderBar.cpp
    Source/UI/DashboardView.cpp
    Source/UI/TrackStatusBar.cpp
    Source/UI/CommentsPanel.cpp
    Source/UI/VersionsPanel.cpp
    Source/UI/CollaboratorsPanel.cpp
    Source/UI/PluginStatusBar.cpp
    Source/UI/SessionView.cpp
    Source/UI/SessionLobby.cpp
    Source/UI/ChatOverlay.cpp
    Source/UI/CollaboratorPanel.cpp
    Source/UI/TrackListPanel.cpp
    Source/UI/TransportBar.cpp
    Source/UI/WaveformDisplay.cpp
    Source/UI/DragDropZone.cpp

    # File Transfer
    Source/FileTransfer/FileTransferManager.cpp
    Source/FileTransfer/DragDropHandler.cpp
)

target_include_directories(GhostSession
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/Source
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/Core
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/Auth
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/Session
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/Network
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/Audio
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/UI
        ${CMAKE_CURRENT_SOURCE_DIR}/Source/FileTransfer
)

target_link_libraries(GhostSession
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_plugin_client
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

target_compile_definitions(GhostSession
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_DISPLAY_SPLASH_SCREEN=0
        JUCE_STRICT_REFCOUNTEDPOINTER=1
)

if(WIN32)
    target_link_libraries(GhostSession PRIVATE ws2_32 winhttp crypt32)
elseif(APPLE)
    find_library(SECURITY_FRAMEWORK Security)
    find_library(COREFOUNDATION_FRAMEWORK CoreFoundation)
    target_link_libraries(GhostSession PRIVATE
        ${SECURITY_FRAMEWORK} ${COREFOUNDATION_FRAMEWORK})
endif()
