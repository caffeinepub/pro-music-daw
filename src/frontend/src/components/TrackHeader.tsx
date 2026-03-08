import { Mic, Volume2, Zap } from "lucide-react";
import { useRef } from "react";
import type { DAWAction } from "../hooks/useDAWState";
import type { DAWTrack } from "../types/daw";

interface TrackHeaderProps {
  track: DAWTrack;
  index: number;
  isSelected: boolean;
  dispatch: React.Dispatch<DAWAction>;
  onSelectFX: () => void;
  trackHeight: number;
}

export function TrackHeader({
  track,
  index,
  isSelected,
  dispatch,
  onSelectFX,
  trackHeight,
}: TrackHeaderProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const ocidIndex = index + 1;

  const toggleMute = () => {
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { muted: !track.muted },
    });
  };

  const toggleSolo = () => {
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { soloed: !track.soloed },
    });
  };

  const toggleArm = () => {
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { armed: !track.armed },
    });
  };

  return (
    <div
      data-ocid={`track.item.${ocidIndex}`}
      className="flex items-center px-2 gap-1.5 border-b cursor-pointer"
      style={{
        height: trackHeight,
        background: isSelected ? "oklch(0.18 0 0)" : "oklch(0.14 0 0)",
        borderColor: "oklch(0.20 0 0)",
        borderLeft: isSelected
          ? `2px solid ${track.color}`
          : "2px solid transparent",
        minWidth: 0,
      }}
      onClick={() => dispatch({ type: "SELECT_TRACK", id: track.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter") dispatch({ type: "SELECT_TRACK", id: track.id });
      }}
    >
      {/* Color swatch */}
      <div
        className="shrink-0 rounded-sm"
        style={{
          width: 4,
          height: trackHeight - 16,
          background: track.color,
          borderRadius: 2,
        }}
      />

      {/* Track name */}
      <input
        ref={nameRef}
        type="text"
        value={track.name}
        onChange={(e) =>
          dispatch({
            type: "UPDATE_TRACK",
            id: track.id,
            updates: { name: e.target.value },
          })
        }
        onClick={(e) => e.stopPropagation()}
        className="flex-1 text-xs bg-transparent outline-none min-w-0 truncate"
        style={{
          color: isSelected ? "oklch(0.88 0 0)" : "oklch(0.70 0 0)",
          fontWeight: isSelected ? 600 : 400,
        }}
      />

      {/* Controls row */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Arm button */}
        <button
          type="button"
          data-ocid={`track.record.${ocidIndex}`}
          className="flex items-center justify-center rounded text-[9px] transition-all"
          style={{
            width: 18,
            height: 18,
            background: track.armed ? "#e85b5b" : "oklch(0.20 0 0)",
            color: track.armed ? "white" : "oklch(0.45 0 0)",
            border: `1px solid ${track.armed ? "#e85b5b" : "oklch(0.28 0 0)"}`,
            boxShadow: track.armed ? "0 0 6px rgba(232, 91, 91, 0.5)" : "none",
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleArm();
          }}
          title="Arm for recording"
        >
          <Mic size={9} />
        </button>

        {/* Mute */}
        <button
          type="button"
          data-ocid={`track.mute_button.${ocidIndex}`}
          className="flex items-center justify-center rounded text-[9px] font-bold transition-all"
          style={{
            width: 18,
            height: 18,
            background: track.muted ? "oklch(0.62 0.22 25)" : "oklch(0.20 0 0)",
            color: track.muted ? "white" : "oklch(0.45 0 0)",
            border: `1px solid ${track.muted ? "oklch(0.62 0.22 25)" : "oklch(0.28 0 0)"}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          title="Mute"
        >
          M
        </button>

        {/* Solo */}
        <button
          type="button"
          data-ocid={`track.solo_button.${ocidIndex}`}
          className="flex items-center justify-center rounded text-[9px] font-bold transition-all"
          style={{
            width: 18,
            height: 18,
            background: track.soloed
              ? "oklch(0.82 0.18 85)"
              : "oklch(0.20 0 0)",
            color: track.soloed ? "oklch(0.10 0 0)" : "oklch(0.45 0 0)",
            border: `1px solid ${track.soloed ? "oklch(0.82 0.18 85)" : "oklch(0.28 0 0)"}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleSolo();
          }}
          title="Solo"
        >
          S
        </button>

        {/* Volume mini */}
        <div className="flex items-center gap-0.5">
          <Volume2 size={9} style={{ color: "oklch(0.40 0 0)" }} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_TRACK",
                id: track.id,
                updates: { volume: Number.parseFloat(e.target.value) },
              })
            }
            onClick={(e) => e.stopPropagation()}
            style={{ width: 40, cursor: "pointer" }}
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
        </div>

        {/* FX button */}
        <button
          type="button"
          className="flex items-center justify-center rounded text-[9px] transition-all"
          style={{
            width: 20,
            height: 18,
            background:
              track.effectsChain.length > 0
                ? "oklch(0.45 0.10 195)"
                : "oklch(0.20 0 0)",
            color:
              track.effectsChain.length > 0
                ? "oklch(0.88 0 0)"
                : "oklch(0.45 0 0)",
            border: `1px solid ${track.effectsChain.length > 0 ? "oklch(0.78 0.15 195)" : "oklch(0.28 0 0)"}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectFX();
          }}
          title={`FX Chain (${track.effectsChain.length} plugins)`}
        >
          <Zap size={9} />
        </button>
      </div>
    </div>
  );
}
