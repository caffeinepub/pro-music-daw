import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EffectsChainPanel } from "./components/EffectsChainPanel";
import { ExportModal } from "./components/ExportModal";
import { MicPermissionModal } from "./components/MicPermissionModal";
import { MixerPanel } from "./components/MixerPanel";
import { PianoRollPanel } from "./components/PianoRollPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SpectrumAnalyzer } from "./components/SpectrumAnalyzer";
import { TopToolbar } from "./components/TopToolbar";
import { TrackArea } from "./components/TrackArea";

import { useAudioEngine } from "./hooks/useAudioEngine";
import { useDAWState } from "./hooks/useDAWState";
import type { BottomPanelTab } from "./types/daw";

const BOTTOM_PANEL_MIN = 120;
const BOTTOM_PANEL_MAX = 500;
const BOTTOM_PANEL_DEFAULT = 280;

export default function App() {
  const { state, dispatch, addTrack, createFXSlot } = useDAWState();
  const audio = useAudioEngine();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playheadBeats, setPlayheadBeats] = useState(0);
  const [showMicModal, setShowMicModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] =
    useState(BOTTOM_PANEL_DEFAULT);
  const playheadRef = useRef(0);
  const rafRef = useRef<number>(0);
  const recordingTrackIdRef = useRef<string | null>(null);
  const panelResizeRef = useRef<{ startY: number; startH: number } | null>(
    null,
  );

  // Show mic permission modal on first load
  useEffect(() => {
    const granted = localStorage.getItem("mic_permission_granted");
    if (!granted) {
      setShowMicModal(true);
    }
  }, []);

  // Sync track nodes when tracks change
  useEffect(() => {
    audio.engineRef.current.audioContext && audio.syncTrackNodes(state.tracks);
  }, [state.tracks, audio]);

  // Sync master volume
  useEffect(() => {
    audio.setMasterVolume(state.masterVolume);
  }, [state.masterVolume, audio]);

  // Sync track volumes and pans
  useEffect(() => {
    for (const track of state.tracks) {
      const effectiveVolume = track.muted ? 0 : track.volume;
      audio.setTrackVolume(track.id, effectiveVolume);
      audio.setTrackPan(track.id, track.pan);
    }
  }, [state.tracks, audio]);

  // Playhead animation loop
  useEffect(() => {
    const update = () => {
      if (audio.engineRef.current.isPlaying) {
        const pos = audio.getPlayheadPosition(state.project.bpm);

        // Loop handling
        if (state.loopEnabled && pos >= state.loopEnd) {
          const loopedPos =
            state.loopStart +
            ((pos - state.loopEnd) % (state.loopEnd - state.loopStart));
          playheadRef.current = loopedPos;
          setPlayheadBeats(loopedPos);

          // Restart audio sources
          for (const track of state.tracks) {
            if (track.audioBuffer) {
              audio.playTrack(
                track.id,
                track.audioBuffer,
                loopedPos,
                state.project.bpm,
              );
            }
          }
          audio.engineRef.current.playheadStartBeat = loopedPos;
          if (audio.engineRef.current.audioContext) {
            audio.engineRef.current.playheadStartTime =
              audio.engineRef.current.audioContext.currentTime;
          }
        } else {
          playheadRef.current = pos;
          setPlayheadBeats(pos);
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    audio,
    state.project.bpm,
    state.loopEnabled,
    state.loopStart,
    state.loopEnd,
    state.tracks,
  ]);

  const handlePlay = useCallback(async () => {
    await audio.ensureContext();
    const eng = audio.engineRef.current;

    if (!eng.isPlaying) {
      eng.isPlaying = true;
      eng.playheadStartBeat = playheadRef.current;
      if (eng.audioContext) {
        eng.playheadStartTime = eng.audioContext.currentTime;
      }
      setIsPlaying(true);

      // Start all track playback
      for (const track of state.tracks) {
        if (track.audioBuffer) {
          audio.playTrack(
            track.id,
            track.audioBuffer,
            playheadRef.current,
            state.project.bpm,
          );
        }
      }

      // Schedule metronome if enabled
      if (state.isMetronomeOn) {
        audio.scheduleMetronome(
          state.project.bpm,
          state.project.timeSignatureNumerator,
          playheadRef.current,
        );
      }
    }
  }, [
    audio,
    state.tracks,
    state.project.bpm,
    state.isMetronomeOn,
    state.project.timeSignatureNumerator,
  ]);

  const handleStop = useCallback(() => {
    const eng = audio.engineRef.current;
    eng.isPlaying = false;
    eng.isRecording = false;
    setIsPlaying(false);
    setIsRecording(false);
    audio.stopAllTracks();

    // Stop metronome oscillators
    for (const osc of eng.metronomeOscillators) {
      try {
        osc.stop();
      } catch {}
    }
    eng.metronomeOscillators = [];
  }, [audio]);

  const handleRewind = useCallback(() => {
    handleStop();
    playheadRef.current = 0;
    setPlayheadBeats(0);
    if (audio.engineRef.current.audioContext) {
      audio.engineRef.current.playheadStartBeat = 0;
      audio.engineRef.current.playheadStartTime =
        audio.engineRef.current.audioContext.currentTime;
    }
  }, [handleStop, audio]);

  const handleRecord = useCallback(async () => {
    const eng = audio.engineRef.current;

    if (eng.isRecording) {
      // Stop recording
      eng.isRecording = false;
      setIsRecording(false);
      const buffer = await audio.stopRecording();

      if (buffer && recordingTrackIdRef.current) {
        const trackId = recordingTrackIdRef.current;
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) {
          dispatch({
            type: "UPDATE_TRACK",
            id: trackId,
            updates: { audioBuffer: buffer, audioFileName: "Recording" },
          });
          toast.success("Recording captured!");
        }
      }
      recordingTrackIdRef.current = null;
    } else {
      // Find armed track or first track
      const armedTrack = state.tracks.find((t) => t.armed) ?? state.tracks[0];
      if (!armedTrack) {
        toast.error("No track available for recording");
        return;
      }

      const recorder = await audio.startRecording(armedTrack.id);
      if (recorder) {
        eng.isRecording = true;
        setIsRecording(true);
        recordingTrackIdRef.current = armedTrack.id;
        toast.success(`Recording on "${armedTrack.name}"`);

        // Also start playback
        if (!eng.isPlaying) {
          await handlePlay();
        }
      } else {
        toast.error("Microphone access denied");
      }
    }
  }, [audio, state.tracks, dispatch, handlePlay]);

  const handlePlayheadClick = useCallback(
    (beats: number) => {
      const wasPlaying = audio.engineRef.current.isPlaying;
      if (wasPlaying) {
        handleStop();
      }
      playheadRef.current = Math.max(0, beats);
      setPlayheadBeats(Math.max(0, beats));
      if (audio.engineRef.current.audioContext) {
        audio.engineRef.current.playheadStartBeat = Math.max(0, beats);
        audio.engineRef.current.playheadStartTime =
          audio.engineRef.current.audioContext.currentTime;
      }
      if (wasPlaying) {
        setTimeout(() => handlePlay(), 50);
      }
    },
    [audio, handleStop, handlePlay],
  );

  const handleDropFile = useCallback(
    async (file: File, trackIndex: number) => {
      const buffer = await audio.loadAudioBuffer(file);
      if (!buffer) {
        toast.error(`Failed to load: ${file.name}`);
        return;
      }

      let trackId: string;
      if (trackIndex < state.tracks.length) {
        trackId = state.tracks[trackIndex].id;
      } else {
        trackId = addTrack(file.name.replace(/\.[^/.]+$/, ""));
      }

      const durationBeats = (buffer.duration * state.project.bpm) / 60;
      const clipId = Math.random().toString(36).slice(2, 10);

      dispatch({
        type: "UPDATE_TRACK",
        id: trackId,
        updates: { audioBuffer: buffer, audioFileName: file.name },
      });

      // Also add a clip at beat 0
      dispatch({
        type: "ADD_CLIP_TO_TRACK",
        trackId,
        clip: {
          id: clipId,
          startBeat: playheadRef.current,
          durationBeats,
          audioBuffer: buffer,
          audioFileName: file.name,
          effectsChain: [],
        },
      });

      toast.success(`Loaded: ${file.name}`);
    },
    [audio, state.tracks, state.project.bpm, addTrack, dispatch],
  );

  const handleExport = useCallback(async () => {
    await audio.ensureContext();
    toast("Exporting project...");

    const durationBeats = Math.max(
      16,
      ...state.tracks
        .filter((t) => t.audioBuffer)
        .map((t) => (t.audioBuffer!.duration * state.project.bpm) / 60),
    );

    const blob = await audio.exportProject(
      state.tracks,
      state.project.bpm,
      durationBeats,
    );
    if (!blob) {
      toast.error("Export failed");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.project.name.replace(/\s+/g, "_")}_export.wav`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Project exported as WAV");
  }, [audio, state.tracks, state.project]);

  const handleImportFile = useCallback(
    async (file: File) => {
      const buffer = await audio.loadAudioBuffer(file);
      if (!buffer) {
        toast.error(`Falha ao carregar: ${file.name}`);
        return;
      }
      // Try to load into selected track, else first available, else new track
      const targetTrack =
        state.tracks.find((t) => t.id === state.selectedTrackId) ??
        state.tracks.find((t) => !t.audioBuffer) ??
        null;

      let trackId: string;
      if (targetTrack) {
        trackId = targetTrack.id;
      } else {
        trackId = addTrack(file.name.replace(/\.[^/.]+$/, ""));
      }

      const durationBeats = (buffer.duration * state.project.bpm) / 60;
      const clipId = Math.random().toString(36).slice(2, 10);

      dispatch({
        type: "UPDATE_TRACK",
        id: trackId,
        updates: { audioBuffer: buffer, audioFileName: file.name },
      });

      // Also add a clip at playhead position
      dispatch({
        type: "ADD_CLIP_TO_TRACK",
        trackId,
        clip: {
          id: clipId,
          startBeat: playheadRef.current,
          durationBeats,
          audioBuffer: buffer,
          audioFileName: file.name,
          effectsChain: [],
        },
      });

      toast.success(`Importado: ${file.name}`);
    },
    [
      audio,
      state.tracks,
      state.selectedTrackId,
      state.project.bpm,
      addTrack,
      dispatch,
    ],
  );

  const handleClearProject = useCallback(() => {
    dispatch({ type: "SET_TRACKS", tracks: [] });
    dispatch({
      type: "SET_PROJECT",
      project: {
        id: Math.random().toString(36).slice(2, 10),
        name: "New Project",
        bpm: 120,
        timeSignatureNumerator: 4,
        timeSignatureDenominator: 4,
      },
    });
    toast.success("Project cleared");
  }, [dispatch]);

  const handlePlayNote = useCallback(
    async (midi: number) => {
      await audio.ensureContext();
      const ctx = audio.engineRef.current.audioContext;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      osc.type = "triangle";
      osc.connect(gain);
      if (audio.engineRef.current.masterGain) {
        gain.connect(audio.engineRef.current.masterGain);
      }
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    },
    [audio],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isPlaying) handleStop();
        else handlePlay();
      } else if (e.code === "Home") {
        e.preventDefault();
        handleRewind();
      } else if (e.code === "KeyR" && !e.ctrlKey) {
        e.preventDefault();
        handleRecord();
      } else if (e.code === "KeyL") {
        e.preventDefault();
        dispatch({
          type: "SET_LOOP",
          start: state.loopStart,
          end: state.loopEnd,
          enabled: !state.loopEnabled,
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isPlaying,
    handlePlay,
    handleStop,
    handleRewind,
    handleRecord,
    dispatch,
    state.loopEnabled,
    state.loopStart,
    state.loopEnd,
  ]);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        width: "100vw",
        background: "oklch(0.10 0 0)",
        overflow: "hidden",
      }}
    >
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0 0)",
            color: "oklch(0.88 0 0)",
            border: "1px solid oklch(0.28 0 0)",
            fontSize: 12,
          },
        }}
      />

      {/* Mic Permission Modal */}
      {showMicModal && (
        <MicPermissionModal
          onGranted={() => setShowMicModal(false)}
          onDismiss={() => setShowMicModal(false)}
        />
      )}

      {/* Export/Import Modal */}
      {showExportModal && (
        <ExportModal
          tracks={state.tracks}
          project={state.project}
          onExportWav={handleExport}
          onImportFile={handleImportFile}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Top Toolbar */}
      <TopToolbar
        state={state}
        dispatch={dispatch}
        isPlaying={isPlaying}
        isRecording={isRecording}
        playheadBeats={playheadBeats}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        onRewind={handleRewind}
        onExport={handleExport}
        onOpenExportModal={() => setShowExportModal(true)}
        onImportFile={handleImportFile}
        onOpenSettings={() =>
          dispatch({ type: "SET_BOTTOM_PANEL_TAB", tab: "settings" })
        }
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
        {/* Track Area */}
        <TrackArea
          state={state}
          dispatch={dispatch}
          playheadBeats={playheadBeats}
          isPlaying={isPlaying}
          addTrack={() => addTrack()}
          onDropFile={handleDropFile}
          onPlayheadClick={handlePlayheadClick}
        />

        {/* Bottom Panel */}
        <div
          className="shrink-0 border-t"
          style={{
            height: bottomPanelHeight,
            borderColor: "oklch(0.22 0 0)",
            background: "oklch(0.12 0 0)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Drag handle to resize panel */}
          <div
            data-ocid="panel.drag_handle"
            className="absolute top-0 left-0 right-0 cursor-ns-resize flex items-center justify-center"
            style={{ height: 6, zIndex: 10 }}
            onMouseDown={(e) => {
              panelResizeRef.current = {
                startY: e.clientY,
                startH: bottomPanelHeight,
              };
              const onMove = (ev: MouseEvent) => {
                if (!panelResizeRef.current) return;
                const delta = panelResizeRef.current.startY - ev.clientY;
                const newH = Math.max(
                  BOTTOM_PANEL_MIN,
                  Math.min(
                    BOTTOM_PANEL_MAX,
                    panelResizeRef.current.startH + delta,
                  ),
                );
                setBottomPanelHeight(newH);
              };
              const onUp = () => {
                panelResizeRef.current = null;
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: 32,
                height: 3,
                background: "oklch(0.28 0 0)",
                marginTop: 1,
              }}
            />
          </div>

          <Tabs
            value={state.bottomPanelTab}
            onValueChange={(v) =>
              dispatch({
                type: "SET_BOTTOM_PANEL_TAB",
                tab: v as BottomPanelTab,
              })
            }
            className="flex flex-col h-full"
          >
            {/* Tab bar */}
            <div
              className="shrink-0 border-b px-2"
              style={{
                borderColor: "oklch(0.20 0 0)",
                background: "oklch(0.13 0 0)",
                paddingTop: 4,
              }}
            >
              <TabsList className="h-8 gap-0 rounded-none bg-transparent p-0">
                {(
                  [
                    "mixer",
                    "fx",
                    "pianoroll",
                    "analyzer",
                    "settings",
                  ] as BottomPanelTab[]
                ).map((tab) => {
                  const labels: Record<BottomPanelTab, string> = {
                    mixer: "Mixer",
                    fx: "FX Chain",
                    pianoroll: "Piano Roll",
                    analyzer: "Analyzer",
                    settings: "Settings",
                  };
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      data-ocid={`${tab}.panel`}
                      className="rounded-none text-xs px-4 h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-2"
                      style={{
                        color:
                          state.bottomPanelTab === tab
                            ? "oklch(0.88 0 0)"
                            : "oklch(0.45 0 0)",
                        borderBottomColor:
                          state.bottomPanelTab === tab
                            ? "oklch(0.78 0.15 195)"
                            : "transparent",
                        background: "transparent",
                      }}
                    >
                      {labels[tab]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <TabsContent value="mixer" className="h-full m-0 p-0">
                <MixerPanel
                  state={state}
                  dispatch={dispatch}
                  getTrackRMS={audio.getTrackRMS}
                  getMasterRMS={audio.getMasterRMS}
                />
              </TabsContent>

              <TabsContent value="fx" className="h-full m-0 p-0">
                <EffectsChainPanel
                  state={state}
                  dispatch={dispatch}
                  createFXSlot={createFXSlot}
                />
              </TabsContent>

              <TabsContent value="pianoroll" className="h-full m-0 p-0">
                <PianoRollPanel
                  state={state}
                  dispatch={dispatch}
                  onPlayNote={handlePlayNote}
                />
              </TabsContent>

              <TabsContent value="analyzer" className="h-full m-0 p-0">
                <SpectrumAnalyzer getSpectrumData={audio.getSpectrumData} />
              </TabsContent>

              <TabsContent value="settings" className="h-full m-0 p-0">
                <SettingsPanel
                  state={state}
                  onClearProject={handleClearProject}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="shrink-0 flex items-center justify-center px-4 text-center"
        style={{
          height: 18,
          background: "oklch(0.10 0 0)",
          borderTop: "1px solid oklch(0.16 0 0)",
        }}
      >
        <span style={{ fontSize: 9, color: "oklch(0.30 0 0)" }}>
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.45 0.10 195)", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </span>
      </footer>
    </div>
  );
}
