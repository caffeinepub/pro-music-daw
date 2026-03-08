import { useCallback } from "react";
import type { DAWAction, DAWState } from "../hooks/useDAWState";
import type { DAWTrack } from "../types/daw";
import { Knob } from "./Knob";
import { VUMeter } from "./VUMeter";

interface MixerPanelProps {
  state: DAWState;
  dispatch: React.Dispatch<DAWAction>;
  getTrackRMS: (trackId: string) => number;
  getMasterRMS: () => number;
}

interface ChannelStripProps {
  track: DAWTrack;
  index: number;
  isSelected: boolean;
  dispatch: React.Dispatch<DAWAction>;
  getRMS: () => number;
}

function ChannelStrip({
  track,
  index,
  isSelected,
  dispatch,
  getRMS,
}: ChannelStripProps) {
  const ocidIndex = index + 1;

  const setVolume = useCallback(
    (v: number) => {
      dispatch({
        type: "UPDATE_TRACK",
        id: track.id,
        updates: { volume: Math.max(0, Math.min(1, v)) },
      });
    },
    [dispatch, track.id],
  );

  const setPan = useCallback(
    (v: number) => {
      dispatch({
        type: "UPDATE_TRACK",
        id: track.id,
        updates: { pan: Math.max(-1, Math.min(1, v)) },
      });
    },
    [dispatch, track.id],
  );

  return (
    <div
      className="flex flex-col items-center py-2 px-1.5 border-r gap-1 cursor-pointer transition-colors"
      style={{
        background: isSelected ? "oklch(0.18 0 0)" : "oklch(0.14 0 0)",
        borderColor: "oklch(0.20 0 0)",
        borderLeft: isSelected ? `2px solid ${track.color}` : undefined,
        minWidth: 64,
        maxWidth: 74,
      }}
      onClick={() => dispatch({ type: "SELECT_TRACK", id: track.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          dispatch({ type: "SELECT_TRACK", id: track.id });
      }}
    >
      {/* Color dot */}
      <div
        className="rounded-full shrink-0"
        style={{ width: 8, height: 8, background: track.color }}
      />

      {/* Track name */}
      <div
        className="text-[9px] text-center leading-tight truncate w-full"
        style={{
          color: isSelected ? "oklch(0.78 0 0)" : "oklch(0.52 0 0)",
          maxWidth: 60,
        }}
        title={track.name}
      >
        {track.name}
      </div>

      {/* Pan knob */}
      <Knob
        value={track.pan}
        min={-1}
        max={1}
        onChange={setPan}
        size={28}
        color={track.color}
        label="Pan"
        defaultValue={0}
      />

      {/* Mute + Solo */}
      <div className="flex gap-1">
        <button
          type="button"
          data-ocid={`mixer.mute_button.${ocidIndex}`}
          className="flex items-center justify-center rounded text-[8px] font-bold"
          style={{
            width: 18,
            height: 14,
            background: track.muted ? "oklch(0.62 0.22 25)" : "oklch(0.22 0 0)",
            color: track.muted ? "white" : "oklch(0.45 0 0)",
            border: `1px solid ${track.muted ? "oklch(0.62 0.22 25)" : "oklch(0.28 0 0)"}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({
              type: "UPDATE_TRACK",
              id: track.id,
              updates: { muted: !track.muted },
            });
          }}
        >
          M
        </button>
        <button
          type="button"
          data-ocid={`mixer.solo_button.${ocidIndex}`}
          className="flex items-center justify-center rounded text-[8px] font-bold"
          style={{
            width: 18,
            height: 14,
            background: track.soloed
              ? "oklch(0.82 0.18 85)"
              : "oklch(0.22 0 0)",
            color: track.soloed ? "oklch(0.10 0 0)" : "oklch(0.45 0 0)",
            border: `1px solid ${track.soloed ? "oklch(0.82 0.18 85)" : "oklch(0.28 0 0)"}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({
              type: "UPDATE_TRACK",
              id: track.id,
              updates: { soloed: !track.soloed },
            });
          }}
        >
          S
        </button>
      </div>

      {/* Fader + VU */}
      <div className="flex items-end gap-1 flex-1" style={{ minHeight: 0 }}>
        {/* Vertical fader */}
        <div className="flex flex-col items-center">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              height: 80,
              width: 18,
              cursor: "pointer",
              WebkitAppearance: "slider-vertical",
              appearance: "auto",
            }}
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
        </div>

        {/* VU Meter */}
        <VUMeter getLevel={getRMS} width={8} height={80} vertical={true} />
      </div>

      {/* dB value */}
      <div
        className="text-[9px] tabular-nums"
        style={{
          color: "oklch(0.40 0 0)",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {track.volume > 0
          ? `${(20 * Math.log10(track.volume)).toFixed(1)}`
          : "-∞"}
      </div>
    </div>
  );
}

export function MixerPanel({
  state,
  dispatch,
  getTrackRMS,
  getMasterRMS,
}: MixerPanelProps) {
  return (
    <div
      data-ocid="mixer.panel"
      className="flex h-full overflow-x-auto overflow-y-hidden"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      {/* Track channels */}
      {state.tracks.map((track, index) => (
        <ChannelStrip
          key={track.id}
          track={track}
          index={index}
          isSelected={state.selectedTrackId === track.id}
          dispatch={dispatch}
          getRMS={() => getTrackRMS(track.id)}
        />
      ))}

      {/* Separator */}
      <div
        className="shrink-0 mx-1 self-stretch"
        style={{
          width: 2,
          background: "oklch(0.22 0 0)",
          margin: "4px 4px",
          borderRadius: 2,
        }}
      />

      {/* Master channel */}
      <div
        className="flex flex-col items-center py-2 px-1.5 gap-1 shrink-0"
        style={{
          background: "oklch(0.16 0 0)",
          minWidth: 74,
          border: "1px solid oklch(0.25 0 0)",
          borderRadius: 4,
          margin: "2px 4px",
        }}
      >
        {/* Master indicator */}
        <div
          className="rounded-full shrink-0"
          style={{ width: 8, height: 8, background: "oklch(0.78 0.15 195)" }}
        />

        <div
          className="text-[9px] font-bold text-center"
          style={{ color: "oklch(0.78 0.15 195)" }}
        >
          MASTER
        </div>

        {/* Master pan */}
        <Knob
          value={0}
          min={-1}
          max={1}
          onChange={() => {}}
          size={28}
          color="oklch(0.78 0.15 195)"
          label="Pan"
          defaultValue={0}
        />

        {/* Spacer */}
        <div className="h-4" />

        {/* Master fader + VU */}
        <div className="flex items-end gap-1 flex-1" style={{ minHeight: 0 }}>
          <div className="flex flex-col items-center">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.masterVolume}
              onChange={(e) =>
                dispatch({
                  type: "SET_MASTER_VOLUME",
                  volume: Number.parseFloat(e.target.value),
                })
              }
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                height: 80,
                width: 18,
                cursor: "pointer",
                WebkitAppearance: "slider-vertical",
                appearance: "auto",
              }}
              title={`Master: ${Math.round(state.masterVolume * 100)}%`}
            />
          </div>

          {/* Stereo VU for master */}
          <div className="flex gap-0.5">
            <VUMeter
              getLevel={getMasterRMS}
              width={8}
              height={80}
              vertical={true}
            />
            <VUMeter
              getLevel={getMasterRMS}
              width={8}
              height={80}
              vertical={true}
            />
          </div>
        </div>

        <div
          className="text-[9px] tabular-nums"
          style={{
            color: "oklch(0.40 0 0)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {state.masterVolume > 0
            ? `${(20 * Math.log10(state.masterVolume)).toFixed(1)}`
            : "-∞"}
        </div>
      </div>
    </div>
  );
}
