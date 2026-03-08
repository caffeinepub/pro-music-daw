import { useCallback, useEffect, useRef, useState } from "react";
import type { DAWAction, DAWState } from "../hooks/useDAWState";
import { type MidiNote, NOTE_NAMES, midiNoteToName } from "../types/daw";

const PIANO_WIDTH = 60;
const NOTE_HEIGHT = 12;
const TOTAL_NOTES = 88; // A0 (21) to C8 (108)
const MIN_MIDI = 21;
const MAX_MIDI = 108;
const RULER_HEIGHT = 24;

interface PianoRollPanelProps {
  state: DAWState;
  dispatch: React.Dispatch<DAWAction>;
  onPlayNote: (midi: number) => void;
}

function isBlackKey(midi: number): boolean {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

export function PianoRollPanel({
  state,
  dispatch,
  onPlayNote,
}: PianoRollPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pianoRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(80); // px per beat
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [snapBeats, setSnapBeats] = useState(0.25);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const rafRef = useRef<number>(0);

  const selectedTrack = state.selectedTrackId
    ? (state.tracks.find((t) => t.id === state.selectedTrackId) ?? null)
    : null;

  const notes = selectedTrack?.midiNotes ?? [];

  const beatsToPx = useCallback(
    (beats: number) => beats * zoom - scrollX,
    [zoom, scrollX],
  );
  const midiToY = useCallback(
    (midi: number) => (MAX_MIDI - midi) * NOTE_HEIGHT - scrollY,
    [scrollY],
  );
  const yToMidi = useCallback(
    (y: number) => MAX_MIDI - Math.floor((y + scrollY) / NOTE_HEIGHT),
    [scrollY],
  );
  const xToBeats = useCallback(
    (x: number) => (x + scrollX) / zoom,
    [zoom, scrollX],
  );

  const snapToGrid = useCallback(
    (beats: number) => Math.round(beats / snapBeats) * snapBeats,
    [snapBeats],
  );

  const generateId = useCallback(
    () => Math.random().toString(36).slice(2, 10),
    [],
  );

  // Draw piano roll
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = container.clientWidth - PIANO_WIDTH;
    const h = container.clientHeight;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "oklch(0.12 0 0)";
    ctx.fillRect(0, 0, w, h);

    // Note rows
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const y = midiToY(midi);
      if (y + NOTE_HEIGHT < 0 || y > h) continue;

      const black = isBlackKey(midi);
      ctx.fillStyle = black ? "oklch(0.10 0 0)" : "oklch(0.13 0 0)";
      ctx.fillRect(0, y, w, NOTE_HEIGHT);

      // Row border
      if (midi % 12 === 0) {
        // C note - brighter line
        ctx.fillStyle = "oklch(0.22 0 0)";
        ctx.fillRect(0, y + NOTE_HEIGHT - 1, w, 1);
      } else {
        ctx.fillStyle = "oklch(0.17 0 0)";
        ctx.fillRect(0, y + NOTE_HEIGHT - 1, w, 1);
      }
    }

    // Beat grid
    const startBeat = scrollX / zoom;
    const endBeat = (scrollX + w) / zoom;
    const timeSig = state.project.timeSignatureNumerator;

    for (let beat = Math.floor(startBeat); beat <= endBeat + 1; beat++) {
      const x = beatsToPx(beat);
      const isBar = beat % timeSig === 0;
      ctx.fillStyle = isBar ? "oklch(0.28 0 0)" : "oklch(0.20 0 0)";
      ctx.fillRect(x, RULER_HEIGHT, 1, h - RULER_HEIGHT);

      // Subdivisions
      if (zoom > 60) {
        for (let sub = 1; sub < 4; sub++) {
          const subX = beatsToPx(beat + sub * 0.25);
          if (subX >= 0 && subX <= w) {
            ctx.fillStyle = "oklch(0.16 0 0)";
            ctx.fillRect(subX, RULER_HEIGHT, 1, h - RULER_HEIGHT);
          }
        }
      }
    }

    // Ruler
    ctx.fillStyle = "oklch(0.16 0 0)";
    ctx.fillRect(0, 0, w, RULER_HEIGHT);

    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "oklch(0.52 0 0)";

    for (let bar = 1; bar <= Math.ceil(endBeat / timeSig) + 1; bar++) {
      const beatOfBar = (bar - 1) * timeSig;
      const x = beatsToPx(beatOfBar);
      if (x < -20 || x > w + 20) continue;
      ctx.fillText(String(bar), x + 3, 16);
    }

    // Draw notes
    for (const note of notes) {
      const x = beatsToPx(note.startBeat);
      const y = midiToY(note.pitch);
      const nw = note.durationBeats * zoom;

      if (x + nw < 0 || x > w || y + NOTE_HEIGHT < 0 || y > h) continue;

      const trackColor = selectedTrack?.color ?? "#00b4d8";

      // Note body
      ctx.fillStyle = trackColor;
      ctx.fillRect(x + 1, y + 1, Math.max(2, nw - 2), NOTE_HEIGHT - 2);

      // Note highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(x + 1, y + 1, Math.max(2, nw - 2), 2);

      // Note label
      if (nw > 24) {
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(midiNoteToName(note.pitch), x + 3, y + NOTE_HEIGHT - 3);
      }
    }
  }, [
    notes,
    zoom,
    scrollX,
    midiToY,
    beatsToPx,
    state.project.timeSignatureNumerator,
    selectedTrack,
  ]);

  // Draw piano keys
  const drawPiano = useCallback(() => {
    const canvas = pianoRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const h = container.clientHeight;
    if (canvas.width !== PIANO_WIDTH || canvas.height !== h) {
      canvas.width = PIANO_WIDTH;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, PIANO_WIDTH, h);
    ctx.fillStyle = "oklch(0.13 0 0)";
    ctx.fillRect(0, 0, PIANO_WIDTH, h);

    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const adjustedY =
        (MAX_MIDI - midi) * NOTE_HEIGHT - scrollY + RULER_HEIGHT;

      if (adjustedY + NOTE_HEIGHT < 0 || adjustedY > h) continue;

      const black = isBlackKey(midi);
      const active = activeKeys.has(midi);
      const isCNote = midi % 12 === 0;

      if (black) {
        ctx.fillStyle = active ? "oklch(0.72 0.18 195)" : "oklch(0.15 0 0)";
        ctx.fillRect(0, adjustedY, PIANO_WIDTH * 0.65, NOTE_HEIGHT);
        ctx.fillStyle = "oklch(0.10 0 0)";
        ctx.fillRect(0, adjustedY + NOTE_HEIGHT - 1, PIANO_WIDTH * 0.65, 1);
      } else {
        ctx.fillStyle = active
          ? "oklch(0.72 0.18 195)"
          : isCNote
            ? "oklch(0.55 0 0)"
            : "oklch(0.78 0 0)";
        ctx.fillRect(0, adjustedY, PIANO_WIDTH, NOTE_HEIGHT);
        ctx.fillStyle = "oklch(0.35 0 0)";
        ctx.fillRect(0, adjustedY + NOTE_HEIGHT - 1, PIANO_WIDTH, 1);

        // C note label
        if (isCNote && NOTE_HEIGHT >= 10) {
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.fillStyle = "oklch(0.25 0 0)";
          ctx.fillText(
            `C${Math.floor(midi / 12) - 1}`,
            2,
            adjustedY + NOTE_HEIGHT - 2,
          );
        }
      }
    }
  }, [scrollY, activeKeys]);

  useEffect(() => {
    const animate = () => {
      drawGrid();
      drawPiano();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawGrid, drawPiano]);

  const handleGridMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !selectedTrack) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top - RULER_HEIGHT;

      if (y < 0) return; // In ruler

      const beat = snapToGrid(xToBeats(x));
      const midi = yToMidi(y + RULER_HEIGHT);

      if (midi < MIN_MIDI || midi > MAX_MIDI) return;

      if (e.button === 2) {
        // Right click: delete note under cursor
        const clickBeat = xToBeats(x);
        const noteToDelete = notes.find(
          (n) =>
            n.pitch === midi &&
            clickBeat >= n.startBeat &&
            clickBeat <= n.startBeat + n.durationBeats,
        );
        if (noteToDelete) {
          dispatch({
            type: "REMOVE_MIDI_NOTE",
            trackId: selectedTrack.id,
            noteId: noteToDelete.id,
          });
        }
        return;
      }

      // Left click: create note
      const noteId = generateId();
      const newNote: MidiNote = {
        id: noteId,
        pitch: midi,
        startBeat: snapToGrid(beat),
        durationBeats: snapBeats,
        velocity: 100,
      };
      dispatch({
        type: "ADD_MIDI_NOTE",
        trackId: selectedTrack.id,
        note: newNote,
      });

      setActiveKeys((prev) => new Set([...prev, midi]));
      onPlayNote(midi);

      setTimeout(() => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 200);
    },
    [
      selectedTrack,
      notes,
      snapToGrid,
      xToBeats,
      yToMidi,
      dispatch,
      snapBeats,
      onPlayNote,
      generateId,
    ],
  );

  const handlePianoClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = pianoRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top - RULER_HEIGHT;
      const midi = MAX_MIDI - Math.floor((y + scrollY) / NOTE_HEIGHT);
      if (midi < MIN_MIDI || midi > MAX_MIDI) return;
      onPlayNote(midi);
      setActiveKeys((prev) => new Set([...prev, midi]));
      setTimeout(() => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 200);
    },
    [scrollY, onPlayNote],
  );

  const handleGridWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.85 : 1.15;
      setZoom((z) => Math.max(20, Math.min(400, z * factor)));
    } else if (e.shiftKey) {
      setScrollX((s) => Math.max(0, s + e.deltaY));
    } else {
      setScrollY((s) =>
        Math.max(0, Math.min(TOTAL_NOTES * NOTE_HEIGHT - 200, s + e.deltaY)),
      );
    }
  }, []);

  return (
    <div
      data-ocid="pianoroll.panel"
      className="flex flex-col h-full"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 border-b shrink-0"
        style={{
          borderColor: "oklch(0.20 0 0)",
          background: "oklch(0.14 0 0)",
        }}
      >
        <span
          className="text-[10px] font-medium"
          style={{ color: "oklch(0.55 0 0)" }}
        >
          Piano Roll
          {selectedTrack && (
            <span style={{ color: selectedTrack.color }}>
              {" "}
              — {selectedTrack.name}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px]" style={{ color: "oklch(0.40 0 0)" }}>
            Snap:
          </span>
          {[0.0625, 0.125, 0.25, 0.5, 1].map((s) => {
            const labels: Record<number, string> = {
              0.0625: "1/16",
              0.125: "1/8",
              0.25: "1/4",
              0.5: "1/2",
              1: "1",
            };
            return (
              <button
                type="button"
                key={s}
                className="px-1.5 py-0.5 rounded text-[9px]"
                style={{
                  background:
                    snapBeats === s
                      ? "oklch(0.78 0.15 195 / 0.3)"
                      : "oklch(0.20 0 0)",
                  color:
                    snapBeats === s
                      ? "oklch(0.78 0.15 195)"
                      : "oklch(0.45 0 0)",
                  border: `1px solid ${snapBeats === s ? "oklch(0.78 0.15 195 / 0.5)" : "oklch(0.25 0 0)"}`,
                }}
                onClick={() => setSnapBeats(s)}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="daw-btn w-6 h-6 p-0 text-[10px]"
            onClick={() => setZoom((z) => Math.max(20, z * 0.8))}
          >
            -
          </button>
          <span
            className="text-[9px] w-8 text-center"
            style={{ color: "oklch(0.45 0 0)", fontFamily: "JetBrains Mono" }}
          >
            {Math.round(zoom)}
          </span>
          <button
            type="button"
            className="daw-btn w-6 h-6 p-0 text-[10px]"
            onClick={() => setZoom((z) => Math.min(400, z * 1.25))}
          >
            +
          </button>
        </div>

        {!selectedTrack && (
          <span className="text-[10px]" style={{ color: "oklch(0.38 0 0)" }}>
            Select a track to edit MIDI
          </span>
        )}
      </div>

      {/* Roll area */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Piano keyboard */}
        <canvas
          ref={pianoRef}
          width={PIANO_WIDTH}
          style={{
            flexShrink: 0,
            cursor: "pointer",
            display: "block",
          }}
          onClick={handlePianoClick}
          onKeyDown={() => {}}
        />

        {/* Grid */}
        <div
          className="flex-1 relative overflow-hidden"
          onWheel={handleGridWheel}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              cursor: "crosshair",
            }}
            onMouseDown={handleGridMouseDown}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {/* Velocity lane */}
      <div
        className="shrink-0 border-t"
        style={{
          height: 40,
          borderColor: "oklch(0.20 0 0)",
          background: "oklch(0.11 0 0)",
          paddingLeft: PIANO_WIDTH,
        }}
      >
        <div
          className="text-[9px] px-2 py-1"
          style={{ color: "oklch(0.38 0 0)" }}
        >
          Velocity
        </div>
      </div>
    </div>
  );
}
