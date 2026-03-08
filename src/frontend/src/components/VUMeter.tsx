import { useEffect, useRef } from "react";

interface VUMeterProps {
  getLevel: () => number; // Returns RMS 0-1
  width?: number;
  height?: number;
  vertical?: boolean;
}

export function VUMeter({
  getLevel,
  width = 12,
  height = 60,
  vertical = true,
}: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const peakRef = useRef(0);
  const peakHoldRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalSegments = 20;
    const gap = 1;

    const draw = () => {
      const rms = getLevel();
      const db = rms > 0 ? 20 * Math.log10(rms) : -80;
      const normalized = Math.max(0, Math.min(1, (db + 60) / 60));

      // Peak hold
      if (normalized > peakRef.current) {
        peakRef.current = normalized;
        peakHoldRef.current = 0;
      } else {
        peakHoldRef.current++;
        if (peakHoldRef.current > 60) {
          peakRef.current = Math.max(0, peakRef.current - 0.01);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (vertical) {
        const segH =
          (canvas.height - (totalSegments - 1) * gap) / totalSegments;
        const filledSegments = Math.floor(normalized * totalSegments);
        const peakSegment = Math.floor(peakRef.current * totalSegments);

        for (let i = 0; i < totalSegments; i++) {
          const segIndex = totalSegments - 1 - i; // Bottom to top
          const y = i * (segH + gap);

          let color: string;
          if (segIndex >= totalSegments - 3) {
            color = "#e85b5b"; // Red top
          } else if (segIndex >= totalSegments - 6) {
            color = "#e8a23c"; // Yellow
          } else {
            color = "#06d6a0"; // Green
          }

          const isActive = segIndex < filledSegments;
          const isPeak = segIndex === peakSegment;

          ctx.fillStyle = isActive || isPeak ? color : "rgba(255,255,255,0.06)";

          ctx.fillRect(0, y, canvas.width, segH);
        }
      } else {
        const segW = (canvas.width - (totalSegments - 1) * gap) / totalSegments;
        const filledSegments = Math.floor(normalized * totalSegments);
        const peakSegment = Math.floor(peakRef.current * totalSegments);

        for (let i = 0; i < totalSegments; i++) {
          const x = i * (segW + gap);

          let color: string;
          if (i >= totalSegments - 3) {
            color = "#e85b5b";
          } else if (i >= totalSegments - 6) {
            color = "#e8a23c";
          } else {
            color = "#06d6a0";
          }

          const isActive = i < filledSegments;
          const isPeak = i === peakSegment;

          ctx.fillStyle = isActive || isPeak ? color : "rgba(255,255,255,0.06)";
          ctx.fillRect(x, 0, segW, canvas.height);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getLevel, vertical]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, imageRendering: "pixelated" }}
    />
  );
}
