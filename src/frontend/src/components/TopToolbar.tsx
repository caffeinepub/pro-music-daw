import {
  Circle,
  Download,
  Music,
  Play,
  Repeat,
  SkipBack,
  Square,
  Waves,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback } from "react";
import type { DAWAction, DAWState } from "../hooks/useDAWState";
import type { TransportPosition } from "../types/daw";

interface TopToolbarProps {
  state: DAWState;
  dispatch: React.Dispatch<DAWAction>;
  isPlaying: boolean;
  isRecording: boolean;
  playheadBeats: number;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRewind: () => void;
  onExport: () => void;
}

function beatsToPosition(beats: number, numerator: number): TransportPosition {
  const totalBeats = Math.max(0, beats);
  const bars = Math.floor(totalBeats / numerator) + 1;
  const beatsInBar = Math.floor(totalBeats % numerator) + 1;
  const ticks = Math.floor((totalBeats % 1) * 960);
  return { bars, beats: beatsInBar, ticks };
}

export function TopToolbar({
  state,
  dispatch,
  isPlaying,
  isRecording,
  playheadBeats,
  onPlay,
  onStop,
  onRecord,
  onRewind,
  onExport,
}: TopToolbarProps) {
  const pos = beatsToPosition(
    playheadBeats,
    state.project.timeSignatureNumerator,
  );

  const handleBpmChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number.parseInt(e.target.value, 10);
      if (!Number.isNaN(val)) dispatch({ type: "SET_BPM", bpm: val });
    },
    [dispatch],
  );

  const handleTimeSigNum = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({
        type: "SET_TIME_SIG",
        numerator: Number.parseInt(e.target.value, 10),
        denominator: state.project.timeSignatureDenominator,
      });
    },
    [dispatch, state.project.timeSignatureDenominator],
  );

  const handleTimeSigDen = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({
        type: "SET_TIME_SIG",
        numerator: state.project.timeSignatureNumerator,
        denominator: Number.parseInt(e.target.value, 10),
      });
    },
    [dispatch, state.project.timeSignatureNumerator],
  );

  return (
    <header
      className="flex items-center px-3 gap-3 shrink-0 border-b"
      style={{
        height: 52,
        background: "oklch(0.13 0 0)",
        borderColor: "oklch(0.22 0 0)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 28,
            height: 28,
            background: "oklch(0.78 0.15 195)",
          }}
        >
          <Waves size={16} style={{ color: "oklch(0.10 0 0)" }} />
        </div>
        <div className="leading-none">
          <div
            className="text-xs font-semibold"
            style={{ color: "oklch(0.88 0 0)" }}
          >
            Pro Music
          </div>
          <div className="text-[9px]" style={{ color: "oklch(0.52 0 0)" }}>
            DAW Studio
          </div>
        </div>
      </div>

      <div
        className="w-px h-7 shrink-0"
        style={{ background: "oklch(0.22 0 0)" }}
      />

      {/* Transport controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          data-ocid="transport.rewind_button"
          className="daw-btn w-8 h-7 p-0"
          onClick={onRewind}
          title="Rewind (Home)"
        >
          <SkipBack size={13} />
        </button>

        <button
          type="button"
          data-ocid="transport.record_button"
          className={`daw-btn w-8 h-7 p-0 danger ${isRecording ? "active" : ""}`}
          onClick={onRecord}
          title="Record (R)"
          style={
            isRecording
              ? { animation: "pulse-recording 1s ease-in-out infinite" }
              : undefined
          }
        >
          <Circle size={13} fill={isRecording ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          data-ocid="transport.stop_button"
          className="daw-btn w-8 h-7 p-0"
          onClick={onStop}
          title="Stop (Space)"
        >
          <Square size={13} />
        </button>

        <button
          type="button"
          data-ocid="transport.play_button"
          className={`daw-btn w-9 h-7 p-0 ${isPlaying ? "active" : ""}`}
          onClick={onPlay}
          title="Play (Space)"
          style={
            isPlaying
              ? {
                  background: "oklch(0.78 0.15 195)",
                  boxShadow: "0 0 10px oklch(0.78 0.15 195 / 0.5)",
                }
              : undefined
          }
        >
          <Play size={13} fill={isPlaying ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          data-ocid="transport.loop_toggle"
          className={`daw-btn w-8 h-7 p-0 ${state.loopEnabled ? "active" : ""}`}
          onClick={() =>
            dispatch({
              type: "SET_LOOP",
              start: state.loopStart,
              end: state.loopEnd,
              enabled: !state.loopEnabled,
            })
          }
          title="Loop (L)"
        >
          <Repeat size={12} />
        </button>
      </div>

      <div
        className="w-px h-7 shrink-0"
        style={{ background: "oklch(0.22 0 0)" }}
      />

      {/* Position display */}
      <div
        className="font-mono text-sm tabular-nums shrink-0 px-2 py-1 rounded"
        style={{
          background: "oklch(0.10 0 0)",
          color: "oklch(0.78 0.15 195)",
          border: "1px solid oklch(0.22 0 0)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          minWidth: 110,
          textAlign: "center",
        }}
      >
        {String(pos.bars).padStart(3, "0")}:{String(pos.beats).padStart(2, "0")}
        :{String(pos.ticks).padStart(3, "0")}
      </div>

      <div
        className="w-px h-7 shrink-0"
        style={{ background: "oklch(0.22 0 0)" }}
      />

      {/* BPM */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label
          htmlFor="bpm-input"
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "oklch(0.45 0 0)" }}
        >
          BPM
        </label>
        <input
          id="bpm-input"
          data-ocid="transport.bpm_input"
          type="number"
          min={20}
          max={300}
          value={state.project.bpm}
          onChange={handleBpmChange}
          className="w-14 text-center rounded text-sm tabular-nums"
          style={{
            background: "oklch(0.10 0 0)",
            color: "oklch(0.88 0 0)",
            border: "1px solid oklch(0.28 0 0)",
            fontFamily: "JetBrains Mono, monospace",
            height: 26,
            outline: "none",
          }}
        />
      </div>

      {/* Time Signature */}
      <div className="flex items-center gap-1 shrink-0">
        <label
          htmlFor="timesig-num"
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "oklch(0.45 0 0)" }}
        >
          TIME
        </label>
        <select
          id="timesig-num"
          value={state.project.timeSignatureNumerator}
          onChange={handleTimeSigNum}
          className="rounded text-xs text-center"
          style={{
            background: "oklch(0.10 0 0)",
            color: "oklch(0.88 0 0)",
            border: "1px solid oklch(0.28 0 0)",
            height: 26,
            width: 36,
            outline: "none",
          }}
        >
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-xs" style={{ color: "oklch(0.52 0 0)" }}>
          /
        </span>
        <select
          value={state.project.timeSignatureDenominator}
          onChange={handleTimeSigDen}
          className="rounded text-xs text-center"
          style={{
            background: "oklch(0.10 0 0)",
            color: "oklch(0.88 0 0)",
            border: "1px solid oklch(0.28 0 0)",
            height: 26,
            width: 36,
            outline: "none",
          }}
        >
          {[4, 8, 16].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div
        className="w-px h-7 shrink-0"
        style={{ background: "oklch(0.22 0 0)" }}
      />

      {/* Metronome */}
      <button
        type="button"
        data-ocid="transport.metronome_toggle"
        className={`daw-btn gap-1 ${state.isMetronomeOn ? "active" : ""}`}
        onClick={() => dispatch({ type: "TOGGLE_METRONOME" })}
        title="Metronome"
      >
        <Music size={11} />
        <span className="text-[10px]">Click</span>
      </button>

      {/* Zoom */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className="daw-btn w-7 h-7 p-0"
          onClick={() =>
            dispatch({ type: "SET_ZOOM", zoom: state.zoom * 0.75 })
          }
          title="Zoom out"
        >
          <ZoomOut size={12} />
        </button>
        <span
          className="text-[10px] tabular-nums w-8 text-center"
          style={{
            color: "oklch(0.52 0 0)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {Math.round(state.zoom)}
        </span>
        <button
          type="button"
          className="daw-btn w-7 h-7 p-0"
          onClick={() =>
            dispatch({ type: "SET_ZOOM", zoom: state.zoom * 1.33 })
          }
          title="Zoom in"
        >
          <ZoomIn size={12} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Project name */}
      <div
        className="text-xs text-center px-2"
        style={{ color: "oklch(0.52 0 0)" }}
      >
        {state.project.name}
      </div>

      <div
        className="w-px h-7 shrink-0"
        style={{ background: "oklch(0.22 0 0)" }}
      />

      {/* Export */}
      <button
        type="button"
        data-ocid="export.button"
        className="daw-btn gap-1.5"
        onClick={onExport}
        title="Export/Render project"
        style={{
          background: "oklch(0.22 0 0)",
          borderColor: "oklch(0.35 0 0)",
          color: "oklch(0.72 0.20 145)",
        }}
      >
        <Download size={12} />
        <span className="text-[10px] font-semibold">Export</span>
      </button>
    </header>
  );
}
