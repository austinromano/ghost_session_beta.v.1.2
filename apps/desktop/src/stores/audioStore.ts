import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../lib/api';

interface LoadedTrack {
  id: string;
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  volume: number;
  muted: boolean;
  soloed: boolean;
}

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadedTracks: Map<string, LoadedTrack>;
  soloActive: boolean;
  soloPlayingTrackId: string | null;
  soloCurrentTime: number;
  soloDuration: number;

  // Actions
  loadTrack: (trackId: string, fileId: string, projectId: string) => Promise<void>;
  unloadTrack: (trackId: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  playSoloTrack: (trackId: string) => void;
  stopSoloTrack: () => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;
  setTrackSoloed: (trackId: string, soloed: boolean) => void;
  cleanup: () => void;
}

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let startedAt = 0; // audioCtx.currentTime when playback started
let pausedAt = 0;  // offset in seconds where we paused
let rafId: number | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let soloSource: AudioBufferSourceNode | null = null;
let soloGain: GainNode | null = null;
let soloStartedAt = 0;
let soloRafId: number | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getMaster() {
  getCtx();
  return masterGain!;
}

export const useAudioStore = create<AudioState>((set, get) => {
  function updatePosition() {
    const ctx = audioCtx;
    if (!ctx || !get().isPlaying) return;
    const elapsed = ctx.currentTime - startedAt;
    set({ currentTime: elapsed });
    rafId = requestAnimationFrame(updatePosition);
  }

  function startAllSources(offset: number) {
    const ctx = getCtx();
    const { loadedTracks } = get();
    const duration = get().duration;

    loadedTracks.forEach((track) => {
      // Stop existing source
      if (track.source) {
        try { track.source.stop(); } catch {}
      }

      // Create new source
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      source.loop = true;
      source.loopEnd = track.buffer.duration;

      const gain = ctx.createGain();
      gain.gain.value = track.muted ? 0 : track.volume;
      source.connect(gain);
      gain.connect(getMaster());

      const trackOffset = offset % track.buffer.duration;
      source.start(0, trackOffset);

      track.source = source;
      track.gainNode = gain;
    });

    startedAt = ctx.currentTime - offset;
    updateSoloState();
  }

  function stopAllSources() {
    const { loadedTracks } = get();
    loadedTracks.forEach((track) => {
      if (track.source) {
        try { track.source.stop(); } catch {}
        track.source = null;
        track.gainNode = null;
      }
    });
  }

  function updateSoloState() {
    const { loadedTracks } = get();
    const anySoloed = Array.from(loadedTracks.values()).some((t) => t.soloed);
    set({ soloActive: anySoloed });

    loadedTracks.forEach((track) => {
      if (track.gainNode) {
        if (track.muted) {
          track.gainNode.gain.value = 0;
        } else if (anySoloed) {
          track.gainNode.gain.value = track.soloed ? track.volume : 0;
        } else {
          track.gainNode.gain.value = track.volume;
        }
      }
    });
  }

  function recalcDuration() {
    const { loadedTracks } = get();
    let maxDur = 0;
    loadedTracks.forEach((t) => {
      if (t.buffer.duration > maxDur) maxDur = t.buffer.duration;
    });
    set({ duration: maxDur });
  }

  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loadedTracks: new Map(),
    soloActive: false,
    soloPlayingTrackId: null,
    soloCurrentTime: 0,
    soloDuration: 0,

    loadTrack: async (trackId, fileId, projectId) => {
      const ctx = getCtx();

      // Check cache first
      if (bufferCache.has(fileId)) {
        const buffer = bufferCache.get(fileId)!;
        const { loadedTracks } = get();
        loadedTracks.set(trackId, {
          id: trackId, buffer, source: null, gainNode: null,
          volume: 1, muted: false, soloed: false,
        });
        set({ loadedTracks: new Map(loadedTracks) });
        recalcDuration();
        return;
      }

      try {
        const url = api.getDirectDownloadUrl(projectId, fileId);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        });
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        bufferCache.set(fileId, buffer);

        const { loadedTracks } = get();
        loadedTracks.set(trackId, {
          id: trackId, buffer, source: null, gainNode: null,
          volume: 1, muted: false, soloed: false,
        });
        set({ loadedTracks: new Map(loadedTracks) });
        recalcDuration();
      } catch (err) {
        console.error('Failed to load track audio:', trackId, err);
      }
    },

    unloadTrack: (trackId) => {
      const { loadedTracks } = get();
      const track = loadedTracks.get(trackId);
      if (track?.source) {
        try { track.source.stop(); } catch {}
      }
      loadedTracks.delete(trackId);
      set({ loadedTracks: new Map(loadedTracks) });
      recalcDuration();
    },

    play: () => {
      if (get().isPlaying) return;
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      startAllSources(pausedAt);
      set({ isPlaying: true });
      rafId = requestAnimationFrame(updatePosition);
    },

    pause: () => {
      if (!get().isPlaying) return;
      const ctx = getCtx();
      pausedAt = ctx.currentTime - startedAt;
      stopAllSources();
      if (rafId) cancelAnimationFrame(rafId);
      set({ isPlaying: false, currentTime: pausedAt });
    },

    stop: () => {
      stopAllSources();
      if (rafId) cancelAnimationFrame(rafId);
      pausedAt = 0;
      startedAt = 0;
      set({ isPlaying: false, currentTime: 0 });
    },

    seekTo: (time) => {
      const wasPlaying = get().isPlaying;
      stopAllSources();
      if (rafId) cancelAnimationFrame(rafId);
      pausedAt = time;
      set({ currentTime: time });
      if (wasPlaying) {
        startAllSources(time);
        set({ isPlaying: true });
        rafId = requestAnimationFrame(updatePosition);
      }
    },

    setTrackVolume: (trackId, volume) => {
      const { loadedTracks } = get();
      const track = loadedTracks.get(trackId);
      if (track) {
        track.volume = volume;
        if (track.gainNode && !track.muted) {
          track.gainNode.gain.value = volume;
        }
        set({ loadedTracks: new Map(loadedTracks) });
      }
    },

    setTrackMuted: (trackId, muted) => {
      const { loadedTracks } = get();
      const track = loadedTracks.get(trackId);
      if (track) {
        track.muted = muted;
        set({ loadedTracks: new Map(loadedTracks) });
        updateSoloState();
      }
    },

    setTrackSoloed: (trackId, soloed) => {
      const { loadedTracks } = get();
      const track = loadedTracks.get(trackId);
      if (track) {
        track.soloed = soloed;
        set({ loadedTracks: new Map(loadedTracks) });
        updateSoloState();
      }
    },

    playSoloTrack: (trackId) => {
      // Stop any existing solo playback
      if (soloSource) { try { soloSource.stop(); } catch {} soloSource = null; }
      if (soloGain) { soloGain.disconnect(); soloGain = null; }
      if (soloRafId) { cancelAnimationFrame(soloRafId); soloRafId = null; }

      // Also stop all-tracks playback if running
      if (get().isPlaying) { get().pause(); }

      const track = get().loadedTracks.get(trackId);
      if (!track) return;

      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      soloSource = ctx.createBufferSource();
      soloSource.buffer = track.buffer;
      soloSource.loop = false;

      soloGain = ctx.createGain();
      soloGain.gain.value = track.volume;
      soloSource.connect(soloGain);
      soloGain.connect(getMaster());

      soloSource.onended = () => {
        if (soloRafId) { cancelAnimationFrame(soloRafId); soloRafId = null; }
        set({ soloPlayingTrackId: null, soloCurrentTime: 0, soloDuration: 0 });
        soloSource = null;
        soloGain?.disconnect();
        soloGain = null;
      };

      soloStartedAt = ctx.currentTime;
      const dur = track.buffer.duration;
      soloSource.start(0);
      set({ soloPlayingTrackId: trackId, soloCurrentTime: 0, soloDuration: dur });

      // Position tracking loop
      function updateSoloPos() {
        if (!get().soloPlayingTrackId) return;
        const elapsed = (audioCtx?.currentTime || 0) - soloStartedAt;
        set({ soloCurrentTime: Math.min(elapsed, dur) });
        soloRafId = requestAnimationFrame(updateSoloPos);
      }
      soloRafId = requestAnimationFrame(updateSoloPos);
    },

    stopSoloTrack: () => {
      if (soloSource) { try { soloSource.stop(); } catch {} soloSource = null; }
      if (soloGain) { soloGain.disconnect(); soloGain = null; }
      if (soloRafId) { cancelAnimationFrame(soloRafId); soloRafId = null; }
      set({ soloPlayingTrackId: null, soloCurrentTime: 0, soloDuration: 0 });
    },

    cleanup: () => {
      stopAllSources();
      if (soloSource) { try { soloSource.stop(); } catch {} soloSource = null; }
      if (soloGain) { soloGain.disconnect(); soloGain = null; }
      if (rafId) cancelAnimationFrame(rafId);
      pausedAt = 0;
      startedAt = 0;
      if (soloRafId) { cancelAnimationFrame(soloRafId); soloRafId = null; }
      set({ isPlaying: false, currentTime: 0, loadedTracks: new Map(), duration: 0, soloPlayingTrackId: null, soloCurrentTime: 0, soloDuration: 0 });
    },
  };
});
