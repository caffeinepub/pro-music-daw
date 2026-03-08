import { useCallback, useEffect, useRef } from "react";
import type { DAWAction } from "../hooks/useDAWState";
import type { DAWTrack } from "../types/daw";

interface TimelineCanvasProps {
  tracks: DAWTrack[];
  zoom: number; // pixels per beat
  scrollX: number;
  playheadBeats: number;
  isPlaying: boolean;
  bpm: number;
  timeSigNumerator: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  trackHeight: number;
  dispatch: React.Dispatch<DAWAction>;
  onDropFile: (file: File, trackIndex: number) => void;
  onPlayheadClick: (beats: number) => void;
}

const RULER_HEIGHT = 28;

export function TimelineCanvas({
  tracks,
  zoom,
  scrollX,
  playheadBeats,
  bpm,
  timeSigNumerator,
  loopStart,
  loopEnd,
  loopEnabled,
  trackHeight,
  dispatch,
  onDropFile,
  onPlayheadClick,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const beatsToPx = useCallback(
    (beats: number) => beats * zoom - scrollX,
    [zoom, scrollX],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "oklch(0.12 0 0)";
    ctx.fillRect(0, 0, width, height);

    // Ruler background
    ctx.fillStyle = "oklch(0.15 0 0)";
    ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Loop region
    if (loopEnabled) {
      const lx = beatsToPx(loopStart);
      const lw = (loopEnd - loopStart) * zoom;
      ctx.fillStyle = "oklch(0.78 0.15 195 / 0.1)";
      ctx.fillRect(lx, RULER_HEIGHT, lw, height - RULER_HEIGHT);
      ctx.strokeStyle = "oklch(0.78 0.15 195 / 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lx, RULER_HEIGHT);
      ctx.lineTo(lx, height);
      ctx.moveTo(lx + lw, RULER_HEIGHT);
      ctx.lineTo(lx + lw, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Calculate visible beats range
    const startBeat = scrollX / zoom;
    const endBeat = (scrollX + width) / zoom;
    const totalBars = Math.ceil(endBeat / timeSigNumerator) + 1;

    // Draw beat lines
    ctx.strokeStyle = "oklch(0.20 0 0)";
    ctx.lineWidth = 1;

    for (let beat = Math.floor(startBeat); beat < endBeat + 1; beat++) {
      const x = beatsToPx(beat);
      const beatInBar = beat % timeSigNumerator;
      const isBarLine = beatInBar === 0;

      if (isBarLine) {
        ctx.strokeStyle = "oklch(0.28 0 0)";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "oklch(0.18 0 0)";
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Ruler tick
      if (isBarLine) {
        ctx.fillStyle = "oklch(0.22 0 0)";
        ctx.fillRect(x, 0, 1, RULER_HEIGHT);
      }
    }

    // Ruler labels
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "oklch(0.55 0 0)";

    for (let bar = 1; bar <= totalBars + 1; bar++) {
      const beatOfBar = (bar - 1) * timeSigNumerator;
      const x = beatsToPx(beatOfBar);
      if (x < -20 || x > width + 20) continue;
      ctx.fillText(String(bar), x + 3, 18);
    }

    // Track backgrounds and waveforms
    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti];
      const trackY = RULER_HEIGHT + ti * trackHeight;

      // Alternating track background
      ctx.fillStyle = ti % 2 === 0 ? "oklch(0.12 0 0)" : "oklch(0.11 0 0)";
      ctx.fillRect(0, trackY, width, trackHeight);

      // Track bottom border
      ctx.fillStyle = "oklch(0.18 0 0)";
      ctx.fillRect(0, trackY + trackHeight - 1, width, 1);

      if (track.audioBuffer) {
        // Draw waveform block
        const blockWidth = ((track.audioBuffer.duration * bpm) / 60) * zoom;
        const blockX = beatsToPx(0);
        const visibleX = Math.max(blockX, 0);
        const visibleEnd = Math.min(blockX + blockWidth, width);

        if (visibleEnd > 0 && visibleX < width) {
          // Block background
          ctx.fillStyle = `${track.color}25`;
          ctx.fillRect(
            visibleX,
            trackY + 2,
            visibleEnd - visibleX,
            trackHeight - 4,
          );

          // Block border
          ctx.strokeStyle = `${track.color}80`;
          ctx.lineWidth = 1;
          ctx.strokeRect(
            visibleX + 0.5,
            trackY + 2.5,
            visibleEnd - visibleX - 1,
            trackHeight - 5,
          );

          // Waveform
          const channelData = track.audioBuffer.getChannelData(0);
          const waveWidth = Math.min(blockWidth, width);
          const step = Math.ceil(channelData.length / waveWidth);

          ctx.beginPath();
          ctx.strokeStyle = track.color;
          ctx.lineWidth = 1;

          const waveH = (trackHeight - 12) / 2;
          const waveY = trackY + trackHeight / 2;

          for (let px = 0; px < waveWidth; px++) {
            const sampleIndex = Math.floor(px * step);
            if (sampleIndex >= channelData.length) break;

            let max = 0;
            for (
              let s = 0;
              s < step && sampleIndex + s < channelData.length;
              s++
            ) {
              max = Math.max(max, Math.abs(channelData[sampleIndex + s]));
            }

            const drawX = blockX + px;
            if (drawX < 0 || drawX > width) continue;

            const h = max * waveH;
            ctx.moveTo(drawX, waveY - h);
            ctx.lineTo(drawX, waveY + h);
          }
          ctx.stroke();

          // Track name label in block
          ctx.font = "10px Sora, sans-serif";
          ctx.fillStyle = track.color;
          ctx.globalAlpha = 0.9;
          ctx.fillText(
            track.audioFileName ?? track.name,
            visibleX + 4,
            trackY + 14,
          );
          ctx.globalAlpha = 1;
        }
      }

      // MIDI notes
      for (const note of track.midiNotes) {
        const noteX = beatsToPx(note.startBeat);
        const noteW = note.durationBeats * zoom;
        if (noteX + noteW < 0 || noteX > width) continue;

        const pitchNorm = (note.pitch - 21) / (108 - 21);
        const noteY = trackY + 4 + pitchNorm * (trackHeight - 12);

        ctx.fillStyle = track.color;
        ctx.fillRect(noteX, noteY, Math.max(2, noteW - 1), 3);
      }
    }

    // Playhead
    const playX = beatsToPx(playheadBeats);
    if (playX >= 0 && playX <= width) {
      // Shadow
      ctx.fillStyle = "oklch(0.78 0.15 195 / 0.15)";
      ctx.fillRect(playX - 1, 0, 3, height);

      ctx.strokeStyle = "oklch(0.78 0.15 195)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = "oklch(0.78 0.15 195)";
      ctx.beginPath();
      ctx.moveTo(playX - 6, 0);
      ctx.lineTo(playX + 6, 0);
      ctx.lineTo(playX, 12);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    tracks,
    zoom,
    scrollX,
    playheadBeats,
    bpm,
    timeSigNumerator,
    loopStart,
    loopEnd,
    loopEnabled,
    trackHeight,
    beatsToPx,
  ]);

  // Render loop
  useEffect(() => {
    const animate = () => {
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Handle click on ruler to set playhead
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y < RULER_HEIGHT) {
        const beats = (x + scrollX) / zoom;
        onPlayheadClick(beats);
        isDraggingRef.current = true;
      }
    },
    [scrollX, zoom, onPlayheadClick],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const beats = (x + scrollX) / zoom;
      onPlayheadClick(Math.max(0, beats));
    },
    [scrollX, zoom, onPlayheadClick],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleScroll = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        dispatch({ type: "SET_ZOOM", zoom: zoom * factor });
      } else {
        dispatch({
          type: "SET_SCROLL_X",
          scrollX: scrollX + e.deltaX + e.deltaY,
        });
      }
    },
    [dispatch, zoom, scrollX],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top - RULER_HEIGHT;
      const trackIndex = Math.floor(y / trackHeight);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) =>
          f.type.startsWith("audio/") ||
          f.name.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i),
      );

      for (const file of files) {
        onDropFile(file, Math.max(0, trackIndex));
      }
    },
    [trackHeight, onDropFile],
  );

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      data-ocid="timeline.dropzone"
      style={{ cursor: "crosshair" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        data-ocid="timeline.canvas_target"
        style={{ display: "block", width: "100%", height: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleScroll}
      />
    </div>
  );
}
