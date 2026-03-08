import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const ocidIndex = index + 1;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const toggleMute = () =>
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { muted: !track.muted },
    });

  const toggleSolo = () =>
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { soloed: !track.soloed },
    });

  const toggleArm = () =>
    dispatch({
      type: "UPDATE_TRACK",
      id: track.id,
      updates: { armed: !track.armed },
    });

  return (
    <div
      data-ocid={`track.item.${ocidIndex}`}
      className="flex items-stretch border-b cursor-pointer select-none"
      style={{
        height: trackHeight,
        background: isSelected ? "oklch(0.17 0 0)" : "oklch(0.13 0 0)",
        borderColor: "oklch(0.19 0 0)",
        borderLeft: `2px solid ${isSelected ? track.color : "oklch(0.20 0 0)"}`,
        transition: "background 0.1s",
        minWidth: 0,
        position: "relative",
      }}
      onClick={() => dispatch({ type: "SELECT_TRACK", id: track.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter") dispatch({ type: "SELECT_TRACK", id: track.id });
      }}
      aria-label={`Track ${index + 1}: ${track.name}`}
    >
      {/* Vertical color strip */}
      <div
        className="shrink-0"
        style={{
          width: 3,
          background: track.color,
          opacity: track.muted ? 0.3 : 1,
        }}
      />

      {/* Main content */}
      <div className="flex flex-col justify-between flex-1 min-w-0 py-1 px-1.5">
        {/* Row 1: Track number + name + ARM + FX badge */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Track number badge */}
          <span
            className="shrink-0 flex items-center justify-center rounded text-[8px]"
            style={{
              width: 14,
              height: 14,
              background: "oklch(0.20 0 0)",
              color: "oklch(0.42 0 0)",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              border: "1px solid oklch(0.25 0 0)",
            }}
          >
            {index + 1}
          </span>

          {/* Track name - editable on double click */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={track.name}
              className="flex-1 min-w-0 text-xs rounded px-1 outline-none"
              style={{
                background: "oklch(0.22 0 0)",
                color: "oklch(0.90 0 0)",
                border: "1px solid oklch(0.78 0.15 195 / 0.5)",
                height: 16,
                fontFamily: "Sora, sans-serif",
                fontSize: 10,
              }}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_TRACK",
                  id: track.id,
                  updates: { name: e.target.value },
                })
              }
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setIsEditingName(false);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 min-w-0 truncate text-[10px] font-medium"
              style={{
                color: isSelected ? "oklch(0.90 0 0)" : "oklch(0.70 0 0)",
                fontFamily: "Sora, sans-serif",
                lineHeight: 1,
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              title={track.name}
            >
              {track.name}
            </span>
          )}

          {/* ARM (Record) button */}
          <button
            type="button"
            data-ocid={`track.record.${ocidIndex}`}
            className="shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold transition-all"
            style={{
              width: 16,
              height: 16,
              background: track.armed ? "#e85b5b" : "oklch(0.20 0 0)",
              color: track.armed ? "white" : "oklch(0.42 0 0)",
              border: `1px solid ${track.armed ? "#e85b5b" : "oklch(0.28 0 0)"}`,
              boxShadow: track.armed ? "0 0 6px rgba(232,91,91,0.6)" : "none",
              animation: track.armed
                ? "pulse-recording 1s ease-in-out infinite"
                : "none",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleArm();
            }}
            title="Armar para gravação"
          >
            R
          </button>

          {/* FX count badge */}
          <button
            type="button"
            className="shrink-0 flex items-center justify-center rounded gap-0.5 transition-all"
            style={{
              height: 16,
              padding: "0 4px",
              background:
                track.effectsChain.length > 0
                  ? "oklch(0.78 0.15 195 / 0.2)"
                  : "oklch(0.18 0 0)",
              color:
                track.effectsChain.length > 0
                  ? "oklch(0.78 0.15 195)"
                  : "oklch(0.35 0 0)",
              border: `1px solid ${track.effectsChain.length > 0 ? "oklch(0.78 0.15 195 / 0.4)" : "oklch(0.22 0 0)"}`,
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFX();
            }}
            title={`FX Chain (${track.effectsChain.length} plugins)`}
          >
            <Zap size={8} />
            <span
              style={{
                fontSize: 8,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 700,
              }}
            >
              {track.effectsChain.length}
            </span>
          </button>
        </div>

        {/* Row 2: M + S + Volume fader + Pan indicator */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Mute */}
          <button
            type="button"
            data-ocid={`track.mute_button.${ocidIndex}`}
            className="shrink-0 flex items-center justify-center rounded text-[9px] font-bold transition-all"
            style={{
              width: 18,
              height: 14,
              background: track.muted
                ? "oklch(0.62 0.22 25)"
                : "oklch(0.18 0 0)",
              color: track.muted ? "white" : "oklch(0.45 0 0)",
              border: `1px solid ${track.muted ? "oklch(0.62 0.22 25)" : "oklch(0.25 0 0)"}`,
              cursor: "pointer",
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
            className="shrink-0 flex items-center justify-center rounded text-[9px] font-bold transition-all"
            style={{
              width: 18,
              height: 14,
              background: track.soloed
                ? "oklch(0.82 0.18 85)"
                : "oklch(0.18 0 0)",
              color: track.soloed ? "oklch(0.10 0 0)" : "oklch(0.45 0 0)",
              border: `1px solid ${track.soloed ? "oklch(0.82 0.18 85)" : "oklch(0.25 0 0)"}`,
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleSolo();
            }}
            title="Solo"
          >
            S
          </button>

          {/* Volume mini fader */}
          <div className="flex items-center flex-1 min-w-0 gap-0.5">
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
              className="flex-1 min-w-0"
              style={{
                height: 14,
                cursor: "pointer",
                maxWidth: 56,
              }}
              title={`Volume: ${Math.round(track.volume * 100)}%`}
            />
            <span
              style={{
                fontSize: 8,
                fontFamily: "JetBrains Mono, monospace",
                color: "oklch(0.38 0 0)",
                minWidth: 22,
                textAlign: "right",
              }}
            >
              {Math.round(track.volume * 100)}%
            </span>
          </div>

          {/* Pan indicator dot */}
          <div
            title={`Pan: ${track.pan > 0 ? "R" : track.pan < 0 ? "L" : "C"}${Math.abs(Math.round(track.pan * 100))}`}
            style={{
              width: 16,
              height: 8,
              background: "oklch(0.18 0 0)",
              borderRadius: 4,
              position: "relative",
              border: "1px solid oklch(0.25 0 0)",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${50 + track.pan * 40}%`,
                transform: "translate(-50%, -50%)",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background:
                  track.pan === 0
                    ? "oklch(0.72 0.20 145)"
                    : "oklch(0.78 0.15 195)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
