import { useCallback, useEffect, useRef, useState } from "react";
import type { FXSlot } from "../types/daw";

interface AnimatedEQUIProps {
  fx: FXSlot;
  onParamChange: (key: string, value: number | string | boolean) => void;
}

const EQ_BANDS = [
  { key: "b1", label: "80Hz", freq: 80 },
  { key: "b2", label: "250Hz", freq: 250 },
  { key: "b3", label: "800Hz", freq: 800 },
  { key: "b4", label: "2.5kHz", freq: 2500 },
  { key: "b5", label: "8kHz", freq: 8000 },
  { key: "b6", label: "16kHz", freq: 16000 },
] as const;

type BandKey = "b1" | "b2" | "b3" | "b4" | "b5" | "b6";

const CANVAS_HEIGHT = 80;
const MAX_GAIN = 12;

function getGain(
  params: Record<string, number | string | boolean>,
  key: BandKey,
): number {
  const val = params[key];
  return typeof val === "number" ? val : 0;
}

export function AnimatedEQUI({ fx, onParamChange }: AnimatedEQUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const prevGainsRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const currentGainsRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const [activeband, setActiveBand] = useState<number>(0);

  const targetGains = EQ_BANDS.map((b) => getGain(fx.params, b.key as BandKey));

  // Update target gains on param change
  useEffect(() => {
    currentGainsRef.current = EQ_BANDS.map((b) =>
      getGain(fx.params, b.key as BandKey),
    );
  }, [fx.params]);

  const drawCurve = useCallback(
    (interpolated: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (i / 4) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // 0dB center line
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Frequency positions (log scale)
      const freqs = EQ_BANDS.map((b) => b.freq);
      const minLog = Math.log10(20);
      const maxLog = Math.log10(20000);

      const freqToX = (f: number) => {
        return ((Math.log10(f) - minLog) / (maxLog - minLog)) * W;
      };

      // Build control points
      const points: { x: number; y: number }[] = [{ x: 0, y: H / 2 }];

      for (let i = 0; i < 6; i++) {
        const x = freqToX(freqs[i]);
        const gain = interpolated[i];
        const y = H / 2 - (gain / MAX_GAIN) * (H / 2 - 6);
        points.push({ x, y });
      }

      points.push({ x: W, y: H / 2 });

      // Draw filled area
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "rgba(34, 197, 94, 0.35)");
      gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.1)");
      gradient.addColorStop(1, "rgba(34, 197, 94, 0.02)");

      ctx.beginPath();
      ctx.moveTo(points[0].x, H);
      ctx.lineTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const cpx1 = (p0.x + p1.x) / 2;
        const cpy1 = p0.y;
        const cpx2 = (p1.x + p2.x) / 2;
        const cpy2 = p1.y;
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p2.x, p2.y);
      }

      ctx.lineTo(points[points.length - 1].x, H);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw curve line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const cpx1 = (p0.x + p1.x) / 2;
        const cpy1 = p0.y;
        const cpx2 = (p1.x + p2.x) / 2;
        const cpy2 = p1.y;
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p2.x, p2.y);
      }

      // Glow effect
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgb(34, 197, 94)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw band dots
      for (let i = 0; i < 6; i++) {
        const x = freqToX(freqs[i]);
        const gain = interpolated[i];
        const y = H / 2 - (gain / MAX_GAIN) * (H / 2 - 6);
        const isActive = i === activeband;

        ctx.beginPath();
        ctx.arc(x, y, isActive ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? "rgb(34, 197, 94)"
          : "rgba(34, 197, 94, 0.7)";
        if (isActive) {
          ctx.shadowColor = "rgba(34, 197, 94, 1)";
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    [activeband],
  );

  // Animation loop — smoothly interpolate gains
  useEffect(() => {
    const animate = () => {
      const targets = EQ_BANDS.map((b) => getGain(fx.params, b.key as BandKey));
      const current = prevGainsRef.current;

      // Lerp towards targets
      const lerped = current.map((c, i) => c + (targets[i] - c) * 0.12);
      prevGainsRef.current = lerped;

      drawCurve(lerped);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawCurve, fx.params]);

  // Set canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = CANVAS_HEIGHT * window.devicePixelRatio;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const activeBandDef = EQ_BANDS[activeband];
  const activeBandGain = targetGains[activeband];

  return (
    <div
      className="flex flex-col gap-2 p-2"
      style={{
        background: "oklch(0.11 0 0)",
        borderRadius: 8,
        minWidth: 280,
      }}
    >
      {/* Header */}
      <div
        className="text-center text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: "oklch(0.72 0.20 145)", letterSpacing: "0.15em" }}
      >
        ◈ GRAPHIC EQ ◈
      </div>

      {/* Canvas frequency curve */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: "#0a0a0a",
          border: "1px solid oklch(0.72 0.20 145 / 0.2)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: CANVAS_HEIGHT }}
        />

        {/* dB labels */}
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 4,
            fontSize: 8,
            fontFamily: "JetBrains Mono, monospace",
            color: "rgba(34, 197, 94, 0.5)",
          }}
        >
          +{MAX_GAIN}dB
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 4,
            fontSize: 8,
            fontFamily: "JetBrains Mono, monospace",
            color: "rgba(34, 197, 94, 0.5)",
          }}
        >
          -{MAX_GAIN}dB
        </div>
      </div>

      {/* Mini band bars */}
      <div
        className="flex gap-1 items-end justify-between"
        style={{ height: 28 }}
      >
        {EQ_BANDS.map((band, i) => {
          const gain = targetGains[i];
          return (
            <button
              type="button"
              key={band.key}
              className="flex flex-col items-center gap-0.5 flex-1"
              style={{
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
              }}
              onClick={() => setActiveBand(i)}
            >
              <div
                style={{
                  width: "100%",
                  height: 20,
                  background: "oklch(0.18 0 0)",
                  borderRadius: 2,
                  position: "relative",
                  border: `1px solid ${i === activeband ? "oklch(0.72 0.20 145 / 0.5)" : "oklch(0.22 0 0)"}`,
                  overflow: "hidden",
                }}
              >
                {/* 0dB marker */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    right: 0,
                    height: 1,
                    background: "oklch(0.30 0 0)",
                  }}
                />
                {/* Bar fill */}
                <div
                  style={{
                    position: "absolute",
                    bottom:
                      gain >= 0
                        ? "50%"
                        : `${50 - Math.abs(gain / MAX_GAIN) * 50}%`,
                    top: gain >= 0 ? `${50 - (gain / MAX_GAIN) * 50}%` : "50%",
                    left: "10%",
                    right: "10%",
                    background:
                      i === activeband
                        ? "oklch(0.72 0.20 145)"
                        : "oklch(0.72 0.20 145 / 0.5)",
                    borderRadius: 1,
                    transition: "all 0.1s ease",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Band number buttons */}
      <div className="flex gap-1">
        {EQ_BANDS.map((band, i) => (
          <button
            key={band.key}
            type="button"
            className="flex-1 rounded text-xs font-bold transition-all"
            style={{
              height: 24,
              background:
                i === activeband ? "oklch(0.72 0.20 145)" : "oklch(0.18 0 0)",
              color: i === activeband ? "oklch(0.10 0 0)" : "oklch(0.50 0 0)",
              border: `1px solid ${i === activeband ? "oklch(0.72 0.20 145)" : "oklch(0.25 0 0)"}`,
              cursor: "pointer",
              fontFamily: "JetBrains Mono, monospace",
              boxShadow:
                i === activeband
                  ? "0 0 8px oklch(0.72 0.20 145 / 0.4)"
                  : "none",
            }}
            onClick={() => setActiveBand(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Active band controls */}
      <div
        className="flex items-center gap-4 rounded-lg px-3 py-2"
        style={{
          background: "oklch(0.10 0 0)",
          border: "1px solid oklch(0.72 0.20 145 / 0.2)",
        }}
      >
        {/* Freq label */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div
            className="text-[10px] font-semibold"
            style={{
              color: "oklch(0.72 0.20 145)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {activeBandDef.label}
          </div>
          <div className="text-[9px]" style={{ color: "oklch(0.38 0 0)" }}>
            Banda {activeband + 1}
          </div>
        </div>

        {/* Vertical fader */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div
            className="text-[10px] font-semibold"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color:
                activeBandGain > 0
                  ? "oklch(0.72 0.20 145)"
                  : activeBandGain < 0
                    ? "oklch(0.62 0.22 25)"
                    : "oklch(0.55 0 0)",
            }}
          >
            {activeBandGain > 0 ? "+" : ""}
            {activeBandGain.toFixed(1)} dB
          </div>
          <input
            type="range"
            min={-MAX_GAIN}
            max={MAX_GAIN}
            step={0.5}
            value={activeBandGain}
            onChange={(e) =>
              onParamChange(
                activeBandDef.key,
                Number.parseFloat(e.target.value),
              )
            }
            style={{
              width: "100%",
              cursor: "pointer",
              accentColor: "oklch(0.72 0.20 145)",
            }}
          />
          <div className="flex justify-between w-full">
            <span className="text-[8px]" style={{ color: "oklch(0.32 0 0)" }}>
              -12
            </span>
            <span className="text-[8px]" style={{ color: "oklch(0.32 0 0)" }}>
              0
            </span>
            <span className="text-[8px]" style={{ color: "oklch(0.32 0 0)" }}>
              +12
            </span>
          </div>
        </div>

        {/* Reset band button */}
        <button
          type="button"
          className="shrink-0 rounded text-[9px] transition-all"
          style={{
            width: 32,
            height: 20,
            background: "oklch(0.18 0 0)",
            border: "1px solid oklch(0.25 0 0)",
            color: "oklch(0.45 0 0)",
            cursor: "pointer",
          }}
          onClick={() => onParamChange(activeBandDef.key, 0)}
        >
          0dB
        </button>
      </div>

      {/* All bands gain display */}
      <div className="flex gap-1">
        {EQ_BANDS.map((band, i) => {
          const gain = targetGains[i];
          return (
            <div
              key={band.key}
              className="flex-1 text-center text-[8px]"
              style={{
                color:
                  i === activeband
                    ? "oklch(0.72 0.20 145)"
                    : gain !== 0
                      ? "oklch(0.55 0 0)"
                      : "oklch(0.32 0 0)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {gain > 0 ? "+" : ""}
              {gain.toFixed(0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
