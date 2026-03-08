import { Plus } from "lucide-react";
import { useCallback } from "react";
import type { DAWAction, DAWState } from "../hooks/useDAWState";
import { TimelineCanvas } from "./TimelineCanvas";
import { TrackHeader } from "./TrackHeader";

const TRACK_HEIGHT = 64;
const HEADER_WIDTH = 220;

interface TrackAreaProps {
  state: DAWState;
  dispatch: React.Dispatch<DAWAction>;
  playheadBeats: number;
  isPlaying: boolean;
  addTrack: () => string;
  onDropFile: (file: File, trackIndex: number) => void;
  onPlayheadClick: (beats: number) => void;
}

export function TrackArea({
  state,
  dispatch,
  playheadBeats,
  isPlaying,
  addTrack,
  onDropFile,
  onPlayheadClick,
}: TrackAreaProps) {
  const handleSelectFX = useCallback(
    (trackId: string) => {
      dispatch({ type: "SELECT_TRACK", id: trackId });
      dispatch({ type: "SET_BOTTOM_PANEL_TAB", tab: "fx" });
    },
    [dispatch],
  );

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Track Headers Column */}
      <div
        className="shrink-0 flex flex-col border-r"
        style={{
          width: HEADER_WIDTH,
          background: "oklch(0.13 0 0)",
          borderColor: "oklch(0.22 0 0)",
          overflowY: "hidden",
        }}
      >
        {/* Ruler spacer */}
        <div
          className="shrink-0 border-b flex items-center justify-between px-2"
          style={{
            height: 28,
            background: "oklch(0.15 0 0)",
            borderColor: "oklch(0.20 0 0)",
          }}
        >
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "oklch(0.40 0 0)" }}
          >
            Tracks
          </span>
          <button
            type="button"
            data-ocid="track.add_button"
            className="daw-btn h-5 w-5 p-0 text-[10px]"
            onClick={addTrack}
            title="Add track"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Track headers */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {state.tracks.map((track, index) => (
            <TrackHeader
              key={track.id}
              track={track}
              index={index}
              isSelected={state.selectedTrackId === track.id}
              dispatch={dispatch}
              onSelectFX={() => handleSelectFX(track.id)}
              trackHeight={TRACK_HEIGHT}
            />
          ))}

          {/* Empty state */}
          {state.tracks.length === 0 && (
            <div
              data-ocid="track.empty_state"
              className="flex flex-col items-center justify-center gap-2 p-4 text-center"
              style={{ color: "oklch(0.40 0 0)", marginTop: 20 }}
            >
              <span className="text-xs">No tracks yet</span>
              <button type="button" className="daw-btn" onClick={addTrack}>
                <Plus size={11} className="mr-1" />
                Add Track
              </button>
            </div>
          )}
        </div>

        {/* Footer with total track count */}
        <div
          className="shrink-0 border-t px-2 py-1 text-[10px]"
          style={{
            borderColor: "oklch(0.20 0 0)",
            background: "oklch(0.12 0 0)",
            color: "oklch(0.35 0 0)",
          }}
        >
          {state.tracks.length} track{state.tracks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Timeline area */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ minHeight: 0, minWidth: 0 }}
      >
        <TimelineCanvas
          tracks={state.tracks}
          zoom={state.zoom}
          scrollX={state.scrollX}
          playheadBeats={playheadBeats}
          isPlaying={isPlaying}
          bpm={state.project.bpm}
          timeSigNumerator={state.project.timeSignatureNumerator}
          loopStart={state.loopStart}
          loopEnd={state.loopEnd}
          loopEnabled={state.loopEnabled}
          trackHeight={TRACK_HEIGHT}
          dispatch={dispatch}
          onDropFile={onDropFile}
          onPlayheadClick={onPlayheadClick}
        />

        {/* Drop zone overlay when no tracks */}
        {state.tracks.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ top: 28 }}
          >
            <div
              className="text-center rounded-lg px-6 py-4"
              style={{
                border: "2px dashed oklch(0.28 0 0)",
                color: "oklch(0.35 0 0)",
              }}
            >
              <div className="text-sm mb-1">Drop audio files here</div>
              <div className="text-xs">or add a track to get started</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { TRACK_HEIGHT, HEADER_WIDTH };
