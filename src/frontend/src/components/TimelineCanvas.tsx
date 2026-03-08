import { useCallback, useEffect, useRef } from "react";
import type { DAWAction } from "../hooks/useDAWState";
import type { DAWTrack } from "../types/daw";

interface TimelineCanvasProps {
  tracks: DAWTrack[];
  zoom: number; // pixels per beat
  scrollX: number;
  playheadBeats: number;
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
  timeSigNumerator: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  trackHeight: number;
  activeToolMode: "select" | "scissors";
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
  isRecording,
  bpm,
  timeSigNumerator,
  loopStart,
  loopEnd,
  loopEnabled,
  trackHeight,
  activeToolMode,
  dispatch,
  onDropFile,
  onPlayheadClick,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  // Touch state
  const touchStartRef = useRef<{
    x: number;
    scrollX: number;
    dist?: number;
    zoom?: number;
  } | null>(null);

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
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Ruler background
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Loop region
    if (loopEnabled) {
      const lx = beatsToPx(loopStart);
      const lw = (loopEnd - loopStart) * zoom;
      ctx.fillStyle = "rgba(0,180,216,0.08)";
      ctx.fillRect(lx, RULER_HEIGHT, lw, height - RULER_HEIGHT);
      ctx.strokeStyle = "rgba(0,180,216,0.35)";
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
    for (let beat = Math.floor(startBeat); beat < endBeat + 1; beat++) {
      const x = beatsToPx(beat);
      const beatInBar = beat % timeSigNumerator;
      const isBarLine = beatInBar === 0;

      ctx.strokeStyle = isBarLine ? "#383838" : "#252525";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Ruler tick
      if (isBarLine) {
        ctx.fillStyle = "#333";
        ctx.fillRect(x, 0, 1, RULER_HEIGHT);
      }
    }

    // Ruler labels
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "#666";
    for (let bar = 1; bar <= totalBars + 1; bar++) {
      const beatOfBar = (bar - 1) * timeSigNumerator;
      const x = beatsToPx(beatOfBar);
      if (x < -20 || x > width + 20) continue;
      ctx.fillText(String(bar), x + 3, 18);
    }

    // Track backgrounds, waveforms, and clips
    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti];
      const trackY = RULER_HEIGHT + ti * trackHeight;

      // Alternating track background
      ctx.fillStyle = ti % 2 === 0 ? "#1a1a1a" : "#171717";
      ctx.fillRect(0, trackY, width, trackHeight);

      // Track bottom border
      ctx.fillStyle = "#242424";
      ctx.fillRect(0, trackY + trackHeight - 1, width, 1);

      // Recording indicator: pulsing red bar on left edge for armed + recording tracks
      if (track.armed && isRecording) {
        const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.fillStyle = `rgba(232,91,91,${pulseAlpha})`;
        ctx.fillRect(0, trackY, 3, trackHeight);
      }

      // Draw track-level audio buffer block (legacy)
      if (track.audioBuffer && track.clips.length === 0) {
        drawAudioBlock(
          ctx,
          track.audioBuffer,
          track.color,
          track.audioFileName ?? track.name,
          beatsToPx(0),
          trackY,
          ((track.audioBuffer.duration * bpm) / 60) * zoom,
          trackHeight,
          width,
          bpm,
          zoom,
        );
      }

      // Draw clips
      for (let ci = 0; ci < track.clips.length; ci++) {
        const clip = track.clips[ci];
        const clipX = beatsToPx(clip.startBeat);
        const clipW = clip.durationBeats * zoom;
        const hasClipFX = clip.effectsChain.length > 0;

        drawAudioBlock(
          ctx,
          clip.audioBuffer ?? null,
          track.color,
          clip.audioFileName ?? `Clip ${ci + 1}`,
          clipX,
          trackY,
          clipW,
          trackHeight,
          width,
          bpm,
          zoom,
          hasClipFX,
        );

        // Clip FX badge
        if (hasClipFX) {
          const visibleX = Math.max(clipX, 0);
          const badgeX = visibleX + 4;
          const badgeY = trackY + trackHeight - 12;
          ctx.fillStyle = `${track.color}cc`;
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.fillText(`FX:${clip.effectsChain.length}`, badgeX, badgeY);
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
      ctx.fillStyle = "rgba(0,180,216,0.12)";
      ctx.fillRect(playX - 1, 0, 3, height);

      ctx.strokeStyle = "rgba(0,180,216,1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = "rgba(0,180,216,1)";
      ctx.beginPath();
      ctx.moveTo(playX - 6, 0);
      ctx.lineTo(playX + 6, 0);
      ctx.lineTo(playX, 12);
      ctx.closePath();
      ctx.fill();
    }

    // Scissors cursor hint line at mouse position (drawn in separate overlay for now)
  }, [
    tracks,
    zoom,
    scrollX,
    playheadBeats,
    isRecording,
    bpm,
    timeSigNumerator,
    loopStart,
    loopEnd,
    loopEnabled,
    trackHeight,
    beatsToPx,
  ]);

  function drawAudioBlock(
    ctx: CanvasRenderingContext2D,
    buffer: AudioBuffer | null,
    color: string,
    label: string,
    blockX: number,
    trackY: number,
    blockWidth: number,
    tHeight: number,
    canvasWidth: number,
    _bpm: number,
    _zoom: number,
    highlighted = false,
  ) {
    const visibleX = Math.max(blockX, 0);
    const visibleEnd = Math.min(blockX + blockWidth, canvasWidth);
    if (visibleEnd <= 0 || visibleX >= canvasWidth) return;

    // Block background
    ctx.fillStyle = highlighted ? `${color}35` : `${color}22`;
    ctx.fillRect(visibleX, trackY + 2, visibleEnd - visibleX, tHeight - 4);

    // Block border
    ctx.strokeStyle = `${color}${highlighted ? "cc" : "70"}`;
    ctx.lineWidth = highlighted ? 1.5 : 1;
    ctx.strokeRect(
      visibleX + 0.5,
      trackY + 2.5,
      visibleEnd - visibleX - 1,
      tHeight - 5,
    );

    // Waveform if buffer present
    if (buffer) {
      const channelData = buffer.getChannelData(0);
      const waveWidth = Math.min(blockWidth, canvasWidth);
      const step = Math.ceil(channelData.length / waveWidth);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      const waveH = (tHeight - 12) / 2;
      const waveY = trackY + tHeight / 2;

      for (let px = 0; px < waveWidth; px++) {
        const sampleIndex = Math.floor(px * step);
        if (sampleIndex >= channelData.length) break;

        let max = 0;
        for (let s = 0; s < step && sampleIndex + s < channelData.length; s++) {
          max = Math.max(max, Math.abs(channelData[sampleIndex + s]));
        }

        const drawX = blockX + px;
        if (drawX < 0 || drawX > canvasWidth) continue;

        const h = max * waveH;
        ctx.moveTo(drawX, waveY - h);
        ctx.lineTo(drawX, waveY + h);
      }
      ctx.stroke();
    }

    // Label
    ctx.font = "10px Sora, sans-serif";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillText(label, visibleX + 4, trackY + 14);
    ctx.globalAlpha = 1;
  }

  // Render loop
  useEffect(() => {
    const animate = () => {
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Find clip at given position
  const findClipAt = useCallback(
    (x: number, y: number) => {
      const beats = (x + scrollX) / zoom;
      const ti = Math.floor((y - RULER_HEIGHT) / trackHeight);
      if (ti < 0 || ti >= tracks.length) return null;
      const track = tracks[ti];
      const clip = track.clips.find(
        (c) => beats >= c.startBeat && beats <= c.startBeat + c.durationBeats,
      );
      if (!clip) return null;
      return { track, clip, beats, trackIndex: ti };
    },
    [scrollX, zoom, trackHeight, tracks],
  );

  // Handle click on ruler or scissors
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
        return;
      }

      if (activeToolMode === "scissors") {
        // Find clip at cursor and split it
        const found = findClipAt(x, y);
        if (found) {
          dispatch({
            type: "SPLIT_CLIP",
            trackId: found.track.id,
            clipId: found.clip.id,
            atBeat: found.beats,
          });
        }
      }
    },
    [scrollX, zoom, onPlayheadClick, activeToolMode, findClipAt, dispatch],
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

  // Touch handlers for swipe + pinch
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          scrollX,
        };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        touchStartRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          scrollX,
          dist,
          zoom,
        };
      }
    },
    [scrollX, zoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;

      if (e.touches.length === 1 && touchStartRef.current.dist === undefined) {
        const deltaX = touchStartRef.current.x - e.touches[0].clientX;
        dispatch({
          type: "SET_SCROLL_X",
          scrollX: Math.max(0, touchStartRef.current.scrollX + deltaX),
        });
      } else if (
        e.touches.length === 2 &&
        touchStartRef.current.dist !== undefined
      ) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchStartRef.current.dist;
        const newZoom = Math.max(
          20,
          Math.min(400, (touchStartRef.current.zoom ?? zoom) * scale),
        );
        dispatch({ type: "SET_ZOOM", zoom: newZoom });
      }
    },
    [dispatch, zoom],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

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

  const cursorStyle =
    activeToolMode === "scissors"
      ? 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>\') 10 10, crosshair'
      : "crosshair";

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      data-ocid="timeline.dropzone"
      style={{ cursor: cursorStyle, touchAction: "none" }}
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
