import {
  ChevronDown,
  ChevronUp,
  Disc3,
  GripVertical,
  Plus,
  Power,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { DAWAction, DAWState } from "../hooks/useDAWState";
import {
  type FXCategory,
  type FXSlot,
  type FXType,
  FX_CATALOG,
  FX_CATEGORIES,
} from "../types/daw";
import { FXPluginUI } from "./FXPluginUI";

interface EffectsChainPanelProps {
  state: DAWState;
  dispatch: React.Dispatch<DAWAction>;
  createFXSlot: (type: FXType) => FXSlot;
}

interface FXSlotRowProps {
  fx: FXSlot;
  index: number;
  trackId: string | null;
  onParamChange: (key: string, value: number | string | boolean) => void;
  onRemove: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function FXSlotRow({
  fx,
  index,
  onParamChange,
  onRemove,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: FXSlotRowProps) {
  const [expanded, setExpanded] = useState(true);

  const CATEGORY_COLORS: Record<string, string> = {
    dynamics: "#e8a23c",
    eq: "#4caf7d",
    reverb: "#5b9cf6",
    delay: "#9b7de8",
    modulation: "#e85bb8",
    pitch: "#e85b5b",
    saturation: "#e87c42",
    spatial: "#42c4e8",
  };

  const def = FX_CATALOG.find((d) => d.type === fx.type);
  const color = def ? (CATEGORY_COLORS[def.category] ?? "#00b4d8") : "#00b4d8";

  return (
    <div
      data-ocid={`fx.item.${index + 1}`}
      className="rounded border overflow-hidden"
      style={{
        background: "oklch(0.15 0 0)",
        borderColor: fx.enabled ? "oklch(0.25 0 0)" : "oklch(0.20 0 0)",
        opacity: fx.enabled ? 1 : 0.5,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-1.5 px-2 py-1"
        style={{
          background: "oklch(0.17 0 0)",
          borderBottom: expanded ? "1px solid oklch(0.20 0 0)" : "none",
        }}
      >
        {/* Grip */}
        <GripVertical
          size={12}
          style={{ color: "oklch(0.35 0 0)", cursor: "grab", flexShrink: 0 }}
        />

        {/* Category dot */}
        <div
          className="rounded-full shrink-0"
          style={{ width: 6, height: 6, background: color }}
        />

        {/* FX Name */}
        <span
          className="flex-1 text-xs font-medium truncate"
          style={{ color: fx.enabled ? "oklch(0.85 0 0)" : "oklch(0.50 0 0)" }}
        >
          {fx.name}
        </span>

        {/* Move buttons */}
        <div className="flex gap-0.5">
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{
              width: 16,
              height: 16,
              background: "oklch(0.20 0 0)",
              color: isFirst ? "oklch(0.28 0 0)" : "oklch(0.50 0 0)",
              border: "none",
            }}
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp size={10} />
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{
              width: 16,
              height: 16,
              background: "oklch(0.20 0 0)",
              color: isLast ? "oklch(0.28 0 0)" : "oklch(0.50 0 0)",
              border: "none",
            }}
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown size={10} />
          </button>
        </div>

        {/* Bypass toggle */}
        <button
          type="button"
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 20,
            height: 20,
            background: fx.enabled ? `${color}30` : "oklch(0.20 0 0)",
            color: fx.enabled ? color : "oklch(0.38 0 0)",
            border: `1px solid ${fx.enabled ? `${color}60` : "oklch(0.28 0 0)"}`,
          }}
          onClick={onToggle}
          title={fx.enabled ? "Bypass" : "Enable"}
        >
          <Power size={10} />
        </button>

        {/* Remove */}
        <button
          type="button"
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 20,
            height: 20,
            background: "oklch(0.20 0 0)",
            color: "oklch(0.38 0 0)",
            border: "1px solid oklch(0.28 0 0)",
          }}
          onClick={onRemove}
          title="Remove FX"
        >
          <X size={10} />
        </button>

        {/* Expand toggle */}
        <button
          type="button"
          className="flex items-center justify-center rounded"
          style={{
            width: 16,
            height: 16,
            color: "oklch(0.40 0 0)",
            background: "none",
            border: "none",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {/* Parameters */}
      {expanded && (
        <div style={{ padding: "4px 4px 6px" }}>
          <FXPluginUI fx={fx} onParamChange={onParamChange} />
        </div>
      )}
    </div>
  );
}

// FX Picker Modal
interface FXPickerProps {
  onSelect: (type: FXType) => void;
  onClose: () => void;
}

function FXPicker({ onSelect, onClose }: FXPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<FXCategory | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const filtered = FX_CATALOG.filter((def) => {
    const matchCategory =
      selectedCategory === "all" || def.category === selectedCategory;
    const matchSearch = def.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="rounded-lg overflow-hidden flex flex-col"
        style={{
          width: 520,
          maxHeight: "80vh",
          background: "oklch(0.15 0 0)",
          border: "1px solid oklch(0.25 0 0)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "oklch(0.22 0 0)" }}
        >
          <div
            className="text-sm font-semibold"
            style={{ color: "oklch(0.85 0 0)" }}
          >
            Add FX Plugin
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{ width: 24, height: 24, color: "oklch(0.50 0 0)" }}
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div
          className="px-4 py-2 border-b"
          style={{ borderColor: "oklch(0.20 0 0)" }}
        >
          <input
            type="text"
            placeholder="Search effects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded px-3 py-1.5 text-xs outline-none"
            style={{
              background: "oklch(0.12 0 0)",
              color: "oklch(0.85 0 0)",
              border: "1px solid oklch(0.28 0 0)",
            }}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <div
            className="flex flex-col py-2 shrink-0 overflow-y-auto"
            style={{
              width: 140,
              borderRight: "1px solid oklch(0.20 0 0)",
              background: "oklch(0.13 0 0)",
            }}
          >
            <button
              type="button"
              className="text-left px-3 py-1.5 text-xs transition-colors"
              style={{
                background:
                  selectedCategory === "all" ? "oklch(0.20 0 0)" : "none",
                color:
                  selectedCategory === "all"
                    ? "oklch(0.85 0 0)"
                    : "oklch(0.52 0 0)",
              }}
              onClick={() => setSelectedCategory("all")}
            >
              All ({FX_CATALOG.length})
            </button>
            {FX_CATEGORIES.map((cat) => {
              const count = FX_CATALOG.filter(
                (d) => d.category === cat.id,
              ).length;
              return (
                <button
                  type="button"
                  key={cat.id}
                  className="text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2"
                  style={{
                    background:
                      selectedCategory === cat.id ? "oklch(0.20 0 0)" : "none",
                    color:
                      selectedCategory === cat.id
                        ? cat.color
                        : "oklch(0.52 0 0)",
                  }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{cat.label}</span>
                  <span
                    style={{ color: "oklch(0.38 0 0)", marginLeft: "auto" }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FX list */}
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-1 content-start">
            {filtered.map((def) => {
              const cat = FX_CATEGORIES.find((c) => c.id === def.category);
              return (
                <button
                  type="button"
                  key={def.type}
                  className="text-left rounded px-3 py-2 transition-all hover:scale-[1.02]"
                  style={{
                    background: "oklch(0.18 0 0)",
                    border: "1px solid oklch(0.25 0 0)",
                    color: "oklch(0.80 0 0)",
                  }}
                  onClick={() => {
                    onSelect(def.type);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: cat?.color ?? "#888",
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-xs font-medium truncate">
                      {def.name}
                    </span>
                  </div>
                  <div
                    className="text-[9px]"
                    style={{ color: "oklch(0.42 0 0)" }}
                  >
                    {cat?.label ?? def.category}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div
                className="col-span-2 text-center py-8 text-xs"
                style={{ color: "oklch(0.38 0 0)" }}
              >
                No effects found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EffectsChainPanel({
  state,
  dispatch,
  createFXSlot,
}: EffectsChainPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isMasterSelected, setIsMasterSelected] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const selectedTrack = state.selectedTrackId
    ? (state.tracks.find((t) => t.id === state.selectedTrackId) ?? null)
    : null;

  const selectedClip =
    selectedClipId && selectedTrack
      ? (selectedTrack.clips.find((c) => c.id === selectedClipId) ?? null)
      : null;

  // Determine what chain to show: clip > track > master
  const effectsChain = isMasterSelected
    ? state.masterFXChain
    : selectedClip
      ? selectedClip.effectsChain
      : (selectedTrack?.effectsChain ?? []);

  const chainLabel = isMasterSelected
    ? "Master"
    : selectedClip
      ? `${selectedTrack?.name ?? "Track"} — Clip ${(selectedTrack?.clips.findIndex((c) => c.id === selectedClipId) ?? 0) + 1} FX`
      : `${selectedTrack?.name ?? "No Track Selected"} — Track FX`;

  const handleAddFX = useCallback(
    (type: FXType) => {
      const fx = createFXSlot(type);
      if (isMasterSelected) {
        dispatch({ type: "ADD_FX_TO_MASTER", fx });
      } else if (selectedClip && selectedTrack) {
        dispatch({
          type: "ADD_FX_TO_CLIP",
          trackId: selectedTrack.id,
          clipId: selectedClip.id,
          fx,
        });
      } else if (selectedTrack) {
        dispatch({ type: "ADD_FX_TO_TRACK", trackId: selectedTrack.id, fx });
      }
    },
    [createFXSlot, dispatch, isMasterSelected, selectedClip, selectedTrack],
  );

  const handleRemoveFX = useCallback(
    (fxId: string) => {
      if (isMasterSelected) {
        dispatch({ type: "REMOVE_FX_FROM_MASTER", fxId });
      } else if (selectedClip && selectedTrack) {
        dispatch({
          type: "REMOVE_FX_FROM_CLIP",
          trackId: selectedTrack.id,
          clipId: selectedClip.id,
          fxId,
        });
      } else if (selectedTrack) {
        dispatch({
          type: "REMOVE_FX_FROM_TRACK",
          trackId: selectedTrack.id,
          fxId,
        });
      }
    },
    [dispatch, isMasterSelected, selectedClip, selectedTrack],
  );

  const handleToggleFX = useCallback(
    (fxId: string) => {
      if (isMasterSelected) {
        dispatch({ type: "TOGGLE_MASTER_FX_BYPASS", fxId });
      } else if (selectedClip && selectedTrack) {
        dispatch({
          type: "TOGGLE_CLIP_FX_BYPASS",
          trackId: selectedTrack.id,
          clipId: selectedClip.id,
          fxId,
        });
      } else if (selectedTrack) {
        dispatch({ type: "TOGGLE_FX_BYPASS", trackId: selectedTrack.id, fxId });
      }
    },
    [dispatch, isMasterSelected, selectedClip, selectedTrack],
  );

  const handleParamChange = useCallback(
    (fxId: string, key: string, value: number | string | boolean) => {
      if (isMasterSelected) {
        dispatch({ type: "UPDATE_MASTER_FX_PARAM", fxId, key, value });
      } else if (selectedClip && selectedTrack) {
        dispatch({
          type: "UPDATE_CLIP_FX_PARAM",
          trackId: selectedTrack.id,
          clipId: selectedClip.id,
          fxId,
          key,
          value,
        });
      } else if (selectedTrack) {
        dispatch({
          type: "UPDATE_FX_PARAM",
          trackId: selectedTrack.id,
          fxId,
          key,
          value,
        });
      }
    },
    [dispatch, isMasterSelected, selectedClip, selectedTrack],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      // Only support track-level FX reordering for now (clip FX can be added later)
      dispatch({
        type: "MOVE_FX",
        trackId: isMasterSelected ? null : (selectedTrack?.id ?? null),
        fromIndex,
        toIndex,
      });
    },
    [dispatch, isMasterSelected, selectedTrack],
  );

  return (
    <div
      data-ocid="fx.panel"
      className="flex flex-col h-full"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b shrink-0 overflow-x-auto"
        style={{
          borderColor: "oklch(0.20 0 0)",
          background: "oklch(0.14 0 0)",
          scrollbarWidth: "none",
        }}
      >
        {/* Track selector — scrollable, no limit */}
        <div className="flex gap-1 shrink-0">
          {state.tracks.map((track) => {
            const isActive =
              state.selectedTrackId === track.id && !isMasterSelected;
            return (
              <button
                type="button"
                key={track.id}
                className="px-2 py-0.5 rounded text-[10px] transition-all shrink-0 flex items-center gap-1"
                style={{
                  background: isActive ? `${track.color}40` : "oklch(0.18 0 0)",
                  color: isActive ? track.color : "oklch(0.50 0 0)",
                  border: `1px solid ${isActive ? `${track.color}60` : "oklch(0.24 0 0)"}`,
                  maxWidth: 90,
                  whiteSpace: "nowrap",
                }}
                onClick={() => {
                  dispatch({ type: "SELECT_TRACK", id: track.id });
                  setIsMasterSelected(false);
                  setSelectedClipId(null);
                }}
                title={`${track.name} (${track.effectsChain.length} FX)`}
              >
                <span className="truncate" style={{ maxWidth: 60 }}>
                  {track.name}
                </span>
                {track.effectsChain.length > 0 && (
                  <span
                    className="rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 13,
                      height: 13,
                      background: isActive
                        ? `${track.color}30`
                        : "oklch(0.22 0 0)",
                      color: isActive ? track.color : "oklch(0.50 0 0)",
                      fontSize: 8,
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 700,
                    }}
                  >
                    {track.effectsChain.length}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="px-2 py-0.5 rounded text-[10px] transition-all shrink-0"
            style={{
              background: isMasterSelected
                ? "oklch(0.78 0.15 195 / 0.3)"
                : "oklch(0.18 0 0)",
              color: isMasterSelected
                ? "oklch(0.78 0.15 195)"
                : "oklch(0.50 0 0)",
              border: `1px solid ${isMasterSelected ? "oklch(0.78 0.15 195 / 0.5)" : "oklch(0.24 0 0)"}`,
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setIsMasterSelected(true);
              setSelectedClipId(null);
            }}
          >
            Master
          </button>
        </div>

        <div className="flex-1 shrink-0" style={{ minWidth: 4 }} />

        {/* FX count */}
        <span
          className="text-[10px] shrink-0"
          style={{ color: "oklch(0.38 0 0)" }}
        >
          {effectsChain.length} FX
        </span>

        {/* Add FX button */}
        <button
          type="button"
          data-ocid="fx.add_button"
          className="daw-btn gap-1 h-6 shrink-0"
          onClick={() => setShowPicker(true)}
          style={{
            background: "oklch(0.78 0.15 195 / 0.2)",
            borderColor: "oklch(0.78 0.15 195 / 0.5)",
            color: "oklch(0.78 0.15 195)",
          }}
        >
          <Plus size={11} />
          <span className="text-[10px]">Add FX</span>
        </button>
      </div>

      {/* Clip selector row — shows clips if a track with clips is selected */}
      {selectedTrack && selectedTrack.clips.length > 0 && !isMasterSelected && (
        <div
          className="flex items-center gap-1 px-2 py-1 border-b shrink-0 overflow-x-auto"
          style={{
            borderColor: "oklch(0.18 0 0)",
            background: "oklch(0.13 0 0)",
            scrollbarWidth: "none",
          }}
        >
          <Disc3 size={9} style={{ color: "oklch(0.45 0 0)", flexShrink: 0 }} />
          <span
            className="text-[9px] mr-1 shrink-0"
            style={{ color: "oklch(0.40 0 0)" }}
          >
            Clip FX:
          </span>
          <button
            type="button"
            className="px-2 py-0.5 rounded text-[9px] transition-all shrink-0"
            style={{
              background:
                selectedClipId === null ? "oklch(0.22 0 0)" : "oklch(0.17 0 0)",
              color:
                selectedClipId === null ? "oklch(0.80 0 0)" : "oklch(0.42 0 0)",
              border: `1px solid ${selectedClipId === null ? "oklch(0.30 0 0)" : "oklch(0.22 0 0)"}`,
            }}
            onClick={() => setSelectedClipId(null)}
          >
            Track FX
          </button>
          {selectedTrack.clips.map((clip, ci) => (
            <button
              type="button"
              key={clip.id}
              className="px-2 py-0.5 rounded text-[9px] transition-all shrink-0 flex items-center gap-1"
              style={{
                background:
                  selectedClipId === clip.id
                    ? `${selectedTrack.color}40`
                    : "oklch(0.17 0 0)",
                color:
                  selectedClipId === clip.id
                    ? selectedTrack.color
                    : "oklch(0.42 0 0)",
                border: `1px solid ${selectedClipId === clip.id ? `${selectedTrack.color}60` : "oklch(0.22 0 0)"}`,
              }}
              onClick={() => setSelectedClipId(clip.id)}
            >
              <span>Clip {ci + 1}</span>
              {clip.effectsChain.length > 0 && (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "JetBrains Mono, monospace",
                    opacity: 0.8,
                  }}
                >
                  ({clip.effectsChain.length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Chain label */}
      <div
        className="px-3 py-1 border-b shrink-0 flex items-center gap-2"
        style={{
          borderColor: "oklch(0.18 0 0)",
          background: "oklch(0.13 0 0)",
        }}
      >
        <span
          className="text-[10px] font-semibold"
          style={{ color: "oklch(0.55 0 0)" }}
        >
          {chainLabel}
        </span>
        {effectsChain.length === 0 && (
          <span className="text-[10px]" style={{ color: "oklch(0.35 0 0)" }}>
            (empty — add up to 5 or more FX)
          </span>
        )}
      </div>

      {/* FX Chain List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-1.5">
        {effectsChain.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-6 rounded"
            style={{
              border: "2px dashed oklch(0.22 0 0)",
              color: "oklch(0.38 0 0)",
            }}
          >
            <span className="text-xs">No effects in chain</span>
            <button
              type="button"
              data-ocid="fx.add_button"
              className="daw-btn gap-1"
              onClick={() => setShowPicker(true)}
            >
              <Plus size={11} />
              <span className="text-[10px]">Add first FX</span>
            </button>
          </div>
        ) : (
          effectsChain.map((fx, i) => (
            <FXSlotRow
              key={fx.id}
              fx={fx}
              index={i}
              trackId={isMasterSelected ? null : (selectedTrack?.id ?? null)}
              onParamChange={(key, value) =>
                handleParamChange(fx.id, key, value)
              }
              onRemove={() => handleRemoveFX(fx.id)}
              onToggle={() => handleToggleFX(fx.id)}
              onMoveUp={() => i > 0 && handleMove(i, i - 1)}
              onMoveDown={() =>
                i < effectsChain.length - 1 && handleMove(i, i + 1)
              }
              isFirst={i === 0}
              isLast={i === effectsChain.length - 1}
            />
          ))
        )}
      </div>

      {/* FX Picker Modal */}
      {showPicker && (
        <FXPicker onSelect={handleAddFX} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
