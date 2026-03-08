import { useCallback, useEffect, useRef } from "react";
import type { DAWTrack } from "../types/daw";

export interface TrackNodes {
  gain: GainNode;
  panner: StereoPannerNode;
  analyser: AnalyserNode;
  source?: AudioBufferSourceNode;
  startTime?: number;
  startOffset?: number;
}

export interface AudioEngineState {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  masterAnalyser: AnalyserNode | null;
  trackNodes: Map<string, TrackNodes>;
  metronomeInterval: number | null;
  isPlaying: boolean;
  isRecording: boolean;
  playheadStartTime: number;
  playheadStartBeat: number;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  metronomeOscillators: OscillatorNode[];
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngineState>({
    audioContext: null,
    masterGain: null,
    masterAnalyser: null,
    trackNodes: new Map(),
    metronomeInterval: null,
    isPlaying: false,
    isRecording: false,
    playheadStartTime: 0,
    playheadStartBeat: 0,
    mediaRecorder: null,
    recordedChunks: [],
    metronomeOscillators: [],
  });

  const ensureContext = useCallback(async () => {
    const eng = engineRef.current;
    if (!eng.audioContext) {
      const ctx = new AudioContext();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.85;
      const masterAnalyser = ctx.createAnalyser();
      masterAnalyser.fftSize = 2048;
      masterGain.connect(masterAnalyser);
      masterAnalyser.connect(ctx.destination);
      eng.audioContext = ctx;
      eng.masterGain = masterGain;
      eng.masterAnalyser = masterAnalyser;
    }
    if (eng.audioContext.state === "suspended") {
      await eng.audioContext.resume();
    }
    return eng.audioContext;
  }, []);

  const setupTrackNodes = useCallback((trackId: string) => {
    const eng = engineRef.current;
    if (!eng.audioContext || !eng.masterGain) return;
    if (eng.trackNodes.has(trackId)) return;

    const ctx = eng.audioContext;
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    gain.connect(panner);
    panner.connect(analyser);
    analyser.connect(eng.masterGain);

    eng.trackNodes.set(trackId, { gain, panner, analyser });
  }, []);

  const removeTrackNodes = useCallback((trackId: string) => {
    const eng = engineRef.current;
    const nodes = eng.trackNodes.get(trackId);
    if (!nodes) return;
    nodes.source?.stop();
    nodes.source?.disconnect();
    nodes.gain.disconnect();
    nodes.panner.disconnect();
    nodes.analyser.disconnect();
    eng.trackNodes.delete(trackId);
  }, []);

  const syncTrackNodes = useCallback(
    (tracks: DAWTrack[]) => {
      const eng = engineRef.current;
      if (!eng.audioContext) return;

      // Setup missing track nodes
      for (const track of tracks) {
        setupTrackNodes(track.id);
      }

      // Update gain/pan values
      for (const track of tracks) {
        const nodes = eng.trackNodes.get(track.id);
        if (!nodes) continue;
        const effectiveVolume = track.muted ? 0 : track.volume;
        nodes.gain.gain.setTargetAtTime(
          effectiveVolume,
          eng.audioContext.currentTime,
          0.01,
        );
        nodes.panner.pan.setTargetAtTime(
          track.pan,
          eng.audioContext.currentTime,
          0.01,
        );
      }
    },
    [setupTrackNodes],
  );

  const setMasterVolume = useCallback((volume: number) => {
    const eng = engineRef.current;
    if (!eng.masterGain || !eng.audioContext) return;
    eng.masterGain.gain.setTargetAtTime(
      volume,
      eng.audioContext.currentTime,
      0.01,
    );
  }, []);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const eng = engineRef.current;
    const nodes = eng.trackNodes.get(trackId);
    if (!nodes || !eng.audioContext) return;
    nodes.gain.gain.setTargetAtTime(volume, eng.audioContext.currentTime, 0.01);
  }, []);

  const setTrackPan = useCallback((trackId: string, pan: number) => {
    const eng = engineRef.current;
    const nodes = eng.trackNodes.get(trackId);
    if (!nodes || !eng.audioContext) return;
    nodes.panner.pan.setTargetAtTime(pan, eng.audioContext.currentTime, 0.01);
  }, []);

  const loadAudioBuffer = useCallback(
    async (file: File): Promise<AudioBuffer | null> => {
      try {
        const ctx = await ensureContext();
        const arrayBuffer = await file.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.error("Failed to decode audio:", e);
        return null;
      }
    },
    [ensureContext],
  );

  const playTrack = useCallback(
    (
      trackId: string,
      audioBuffer: AudioBuffer,
      offsetBeats: number,
      bpm: number,
    ) => {
      const eng = engineRef.current;
      const nodes = eng.trackNodes.get(trackId);
      if (!nodes || !eng.audioContext) return;

      // Stop existing source
      if (nodes.source) {
        try {
          nodes.source.stop();
        } catch {}
        nodes.source.disconnect();
        nodes.source = undefined;
      }

      const source = eng.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(nodes.gain);

      const secondsPerBeat = 60 / bpm;
      const offsetSeconds = offsetBeats * secondsPerBeat;

      if (offsetSeconds < audioBuffer.duration) {
        source.start(0, offsetSeconds);
      }

      nodes.source = source;
      nodes.startTime = eng.audioContext.currentTime;
      nodes.startOffset = offsetBeats;
    },
    [],
  );

  const stopTrack = useCallback((trackId: string) => {
    const eng = engineRef.current;
    const nodes = eng.trackNodes.get(trackId);
    if (!nodes?.source) return;
    try {
      nodes.source.stop();
    } catch {}
    nodes.source.disconnect();
    nodes.source = undefined;
  }, []);

  const stopAllTracks = useCallback(() => {
    const eng = engineRef.current;
    for (const [id] of eng.trackNodes) {
      stopTrack(id);
    }
  }, [stopTrack]);

  const getPlayheadPosition = useCallback((bpm: number): number => {
    const eng = engineRef.current;
    if (!eng.audioContext || !eng.isPlaying) return eng.playheadStartBeat;
    const elapsed = eng.audioContext.currentTime - eng.playheadStartTime;
    const elapsedBeats = elapsed * (bpm / 60);
    return eng.playheadStartBeat + elapsedBeats;
  }, []);

  const scheduleMetronome = useCallback(
    (bpm: number, timeSigNum: number, startBeat: number) => {
      const eng = engineRef.current;
      if (!eng.audioContext) return;

      const ctx = eng.audioContext;
      const secondsPerBeat = 60 / bpm;
      const now = ctx.currentTime;

      // Cancel existing oscillators
      for (const osc of eng.metronomeOscillators) {
        try {
          osc.stop();
        } catch {}
      }
      eng.metronomeOscillators = [];

      // Schedule 8 bars of clicks
      const beatsToSchedule = timeSigNum * 8;
      const currentBeatInBar = Math.floor(startBeat) % timeSigNum;

      for (let i = 0; i < beatsToSchedule; i++) {
        const beatInBar = (currentBeatInBar + i) % timeSigNum;
        const time = now + i * secondsPerBeat;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = beatInBar === 0 ? 1200 : 900;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.05);
        eng.metronomeOscillators.push(osc);
      }
    },
    [],
  );

  const getTrackRMS = useCallback((trackId: string): number => {
    const eng = engineRef.current;
    const nodes = eng.trackNodes.get(trackId);
    if (!nodes) return 0;

    const bufferLength = nodes.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    nodes.analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / bufferLength);
  }, []);

  const getMasterRMS = useCallback((): number => {
    const eng = engineRef.current;
    if (!eng.masterAnalyser) return 0;

    const bufferLength = eng.masterAnalyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    eng.masterAnalyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / bufferLength);
  }, []);

  const getSpectrumData = useCallback((): Float32Array | null => {
    const eng = engineRef.current;
    if (!eng.masterAnalyser) return null;

    eng.masterAnalyser.fftSize = 2048;
    const bufferLength = eng.masterAnalyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    eng.masterAnalyser.getFloatFrequencyData(dataArray);
    return dataArray;
  }, []);

  const startRecording = useCallback(
    async (_trackId: string): Promise<MediaRecorder | null> => {
      try {
        await ensureContext();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 1,
          },
        });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        const eng = engineRef.current;
        eng.recordedChunks = chunks;
        eng.mediaRecorder = mediaRecorder;
        mediaRecorder.start(100);

        return mediaRecorder;
      } catch (e) {
        console.error("Failed to start recording:", e);
        return null;
      }
    },
    [ensureContext],
  );

  const stopRecording = useCallback(async (): Promise<AudioBuffer | null> => {
    const eng = engineRef.current;
    if (!eng.mediaRecorder || !eng.audioContext) return null;

    return new Promise((resolve) => {
      if (!eng.mediaRecorder) return resolve(null);
      eng.mediaRecorder.onstop = async () => {
        const blob = new Blob(eng.recordedChunks, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        try {
          const buffer = await eng.audioContext!.decodeAudioData(arrayBuffer);
          resolve(buffer);
        } catch {
          resolve(null);
        }
        // Stop all tracks
        if (eng.mediaRecorder) {
          for (const t of eng.mediaRecorder.stream.getTracks()) {
            t.stop();
          }
        }
      };
      eng.mediaRecorder.stop();
    });
  }, []);

  const exportProject = useCallback(
    async (
      tracks: DAWTrack[],
      bpm: number,
      durationBeats: number,
      sampleRate = 44100,
    ): Promise<Blob | null> => {
      await ensureContext();
      const durationSeconds = (durationBeats / bpm) * 60;
      const offlineCtx = new OfflineAudioContext(
        2,
        sampleRate * durationSeconds,
        sampleRate,
      );
      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(offlineCtx.destination);

      for (const track of tracks) {
        if (!track.audioBuffer || track.muted) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = track.audioBuffer;
        const gain = offlineCtx.createGain();
        gain.gain.value = track.volume;
        const panner = offlineCtx.createStereoPanner();
        panner.pan.value = track.pan;
        source.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain);
        source.start(0);
      }

      try {
        const renderedBuffer = await offlineCtx.startRendering();
        return audioBufferToWav(renderedBuffer);
      } catch (e) {
        console.error("Export failed:", e);
        return null;
      }
    },
    [ensureContext],
  );

  useEffect(() => {
    return () => {
      const eng = engineRef.current;
      if (eng.audioContext) {
        eng.audioContext.close();
      }
    };
  }, []);

  return {
    engineRef,
    ensureContext,
    setupTrackNodes,
    removeTrackNodes,
    syncTrackNodes,
    setMasterVolume,
    setTrackVolume,
    setTrackPan,
    loadAudioBuffer,
    playTrack,
    stopTrack,
    stopAllTracks,
    getPlayheadPosition,
    scheduleMetronome,
    getTrackRMS,
    getMasterRMS,
    getSpectrumData,
    startRecording,
    stopRecording,
    exportProject,
  };
}

// WAV encoding
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
