import { useEffect, useRef, useState } from "react";
import { NOTE_NAMES } from "../types/daw";
import type { FXSlot } from "../types/daw";
import { Knob } from "./Knob";

interface AnimatedAutoTuneUIProps {
  fx: FXSlot;
  onParamChange: (key: string, value: number | string | boolean) => void;
}

const SCALES = ["Major", "Minor", "Chromatic", "Pentatonic"];

export function AnimatedAutoTuneUI({
  fx,
  onParamChange,
}: AnimatedAutoTuneUIProps) {
  const needleRef = useRef<HTMLDivElement>(null);
  const centsRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [centsDisplay, setCentsDisplay] = useState(0);

  const currentKey = (fx.params.key as string) ?? "C";
  const currentScale = (fx.params.scale as string) ?? "Major";
  const correction = (fx.params.correction as number) ?? 0.8;
  const speed = (fx.params.speed as number) ?? 10;

  // Animate needle with simulated pitch deviation
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt;

      // Simulate a slowly drifting pitch with multiple sine waves
      const drift =
        Math.sin(timeRef.current * 0.7) * 28 +
        Math.sin(timeRef.current * 1.3) * 12 +
        Math.sin(timeRef.current * 2.1) * 6;

      centsRef.current = drift;
      setCentsDisplay(Math.round(drift));

      if (needleRef.current) {
        // Rotate needle: -50cents = -60deg, +50cents = +60deg
        const angle = (drift / 50) * 60;
        needleRef.current.style.transform = `rotate(${angle}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const centsColor =
    Math.abs(centsDisplay) < 8
      ? "#22c55e"
      : Math.abs(centsDisplay) < 25
        ? "#eab308"
        : centsDisplay < 0
          ? "#f97316"
          : "#3b82f6";

  return (
    <div
      className="flex flex-col gap-3 p-2"
      style={{
        background: "oklch(0.11 0 0)",
        borderRadius: 8,
        minWidth: 320,
      }}
    >
      {/* Header label */}
      <div
        className="text-center text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: "oklch(0.62 0.22 25)", letterSpacing: "0.15em" }}
      >
        ◈ AUTO-TUNE ◈
      </div>

      {/* Main 3-column layout */}
      <div className="flex gap-3 items-start">
        {/* LEFT: Key display + note picker */}
        <div
          className="flex flex-col items-center gap-2 shrink-0"
          style={{ width: 100 }}
        >
          {/* Large note display */}
          <div
            className="flex items-center justify-center rounded-xl relative"
            style={{
              width: 96,
              height: 80,
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.62 0.22 25 / 0.4)",
              boxShadow:
                "0 0 20px oklch(0.62 0.22 25 / 0.15), inset 0 0 20px oklch(0.62 0.22 25 / 0.05)",
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: "JetBrains Mono, monospace",
                color: "oklch(0.62 0.22 25)",
                textShadow: "0 0 20px oklch(0.62 0.22 25 / 0.8)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {currentKey}
            </span>
            <span
              style={{
                position: "absolute",
                bottom: 6,
                right: 8,
                fontSize: 12,
                color: "oklch(0.62 0.22 25 / 0.6)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              4
            </span>
          </div>
          <div
            className="text-[9px] text-center"
            style={{ color: "oklch(0.40 0 0)" }}
          >
            NOTA REFERÊNCIA
          </div>

          {/* Key pills grid */}
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", width: 96 }}
          >
            {NOTE_NAMES.map((note) => (
              <button
                key={note}
                type="button"
                className="flex items-center justify-center rounded text-[8px] font-medium transition-all"
                style={{
                  height: 16,
                  background:
                    note === currentKey
                      ? "oklch(0.62 0.22 25)"
                      : "oklch(0.18 0 0)",
                  color:
                    note === currentKey ? "oklch(0.10 0 0)" : "oklch(0.52 0 0)",
                  border: `1px solid ${note === currentKey ? "oklch(0.62 0.22 25)" : "oklch(0.25 0 0)"}`,
                  cursor: "pointer",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: note.includes("#") ? 7 : 8,
                }}
                onClick={() => onParamChange("key", note)}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Tuning meter */}
        <div
          className="flex flex-col items-center gap-2 flex-1"
          style={{ minWidth: 0 }}
        >
          {/* VU Meter arc */}
          <div
            className="relative flex items-end justify-center"
            style={{ width: "100%", height: 90 }}
          >
            {/* Arc background */}
            <svg
              viewBox="0 0 160 90"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
              aria-hidden="true"
            >
              {/* Arc segments */}
              {/* Flat zone (left, orange-red) */}
              <path
                d="M 20 80 A 60 60 0 0 1 55 26"
                fill="none"
                stroke="oklch(0.62 0.22 25 / 0.4)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* In-tune zone (center, green) */}
              <path
                d="M 65 20 A 60 60 0 0 1 95 20"
                fill="none"
                stroke="oklch(0.72 0.20 145 / 0.5)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Sharp zone (right, blue) */}
              <path
                d="M 105 26 A 60 60 0 0 1 140 80"
                fill="none"
                stroke="oklch(0.60 0.15 240 / 0.4)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Tick marks */}
              {[-50, -25, 0, 25, 50].map((val) => {
                const angle = (val / 50) * 60;
                const rad = ((angle - 90) * Math.PI) / 180;
                const r = 60;
                const cx = 80;
                const cy = 80;
                const x1 = cx + r * Math.cos(rad);
                const y1 = cy + r * Math.sin(rad);
                const x2 = cx + (r - 10) * Math.cos(rad);
                const y2 = cy + (r - 10) * Math.sin(rad);
                return (
                  <line
                    key={val}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={
                      val === 0
                        ? "oklch(0.72 0.20 145 / 0.8)"
                        : "oklch(0.35 0 0)"
                    }
                    strokeWidth={val === 0 ? 2 : 1}
                  />
                );
              })}

              {/* Labels */}
              <text
                x="14"
                y="85"
                fontSize="7"
                fill="oklch(0.50 0 0)"
                fontFamily="JetBrains Mono, monospace"
              >
                -50
              </text>
              <text
                x="68"
                y="16"
                fontSize="7"
                fill="oklch(0.72 0.20 145)"
                fontFamily="JetBrains Mono, monospace"
              >
                0
              </text>
              <text
                x="132"
                y="85"
                fontSize="7"
                fill="oklch(0.50 0 0)"
                fontFamily="JetBrains Mono, monospace"
              >
                +50
              </text>
            </svg>

            {/* Needle pivot */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "oklch(0.78 0.15 195)",
                boxShadow: "0 0 6px oklch(0.78 0.15 195 / 0.8)",
                zIndex: 2,
              }}
            />

            {/* Needle */}
            <div
              ref={needleRef}
              style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                width: 2,
                height: 60,
                marginLeft: -1,
                transformOrigin: "bottom center",
                transition: "transform 0.08s ease-out",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(to top, ${centsColor}, oklch(0.88 0 0))`,
                  borderRadius: "1px 1px 0 0",
                  boxShadow: `0 0 4px ${centsColor}80`,
                }}
              />
            </div>
          </div>

          {/* Cents display */}
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: "100%",
              height: 28,
              background: "oklch(0.08 0 0)",
              border: `1px solid ${centsColor}40`,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 16,
                fontWeight: 700,
                color: centsColor,
                textShadow: `0 0 8px ${centsColor}80`,
                minWidth: 60,
                textAlign: "center",
              }}
            >
              {centsDisplay > 0 ? "+" : ""}
              {centsDisplay}¢
            </span>
          </div>

          {/* Flat / Sharp labels */}
          <div className="flex justify-between w-full">
            <span
              className="text-[9px]"
              style={{ color: "oklch(0.62 0.22 25 / 0.7)" }}
            >
              ♭ BEMOL
            </span>
            <span
              className="text-[9px] text-center"
              style={{ color: "oklch(0.72 0.20 145 / 0.8)" }}
            >
              AFINADO
            </span>
            <span
              className="text-[9px]"
              style={{ color: "oklch(0.60 0.15 240 / 0.7)" }}
            >
              # SUSTENIDO
            </span>
          </div>
        </div>

        {/* RIGHT: Scale + knobs */}
        <div className="flex flex-col gap-2 shrink-0" style={{ width: 80 }}>
          {/* Scale selector */}
          <div className="flex flex-col gap-1">
            <div
              className="text-[9px] uppercase tracking-wider text-center"
              style={{ color: "oklch(0.42 0 0)" }}
            >
              Escala
            </div>
            {SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                className="rounded text-[9px] text-center transition-all"
                style={{
                  height: 18,
                  background:
                    scale.toLowerCase() === currentScale.toLowerCase()
                      ? "oklch(0.62 0.22 25 / 0.3)"
                      : "oklch(0.16 0 0)",
                  color:
                    scale.toLowerCase() === currentScale.toLowerCase()
                      ? "oklch(0.62 0.22 25)"
                      : "oklch(0.45 0 0)",
                  border: `1px solid ${scale.toLowerCase() === currentScale.toLowerCase() ? "oklch(0.62 0.22 25 / 0.5)" : "oklch(0.22 0 0)"}`,
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                }}
                onClick={() => onParamChange("scale", scale.toLowerCase())}
              >
                {scale}
              </button>
            ))}
          </div>

          {/* Knobs */}
          <Knob
            value={correction}
            min={0}
            max={1}
            onChange={(v) => onParamChange("correction", v)}
            size={32}
            color="oklch(0.62 0.22 25)"
            label="Correção"
            defaultValue={0.8}
          />
          <Knob
            value={speed}
            min={0}
            max={100}
            onChange={(v) => onParamChange("speed", v)}
            size={32}
            color="oklch(0.62 0.22 25)"
            label="Speed"
            unit="ms"
            defaultValue={10}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div
        className="flex items-center justify-center gap-2 rounded-lg px-3 py-1.5"
        style={{
          background: "oklch(0.08 0 0)",
          border: "1px solid oklch(0.18 0 0)",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background:
              Math.abs(centsDisplay) < 8
                ? "oklch(0.72 0.20 145)"
                : "oklch(0.62 0.22 25)",
            boxShadow: `0 0 4px ${Math.abs(centsDisplay) < 8 ? "oklch(0.72 0.20 145)" : "oklch(0.62 0.22 25)"}`,
            animation: "pulse-dot 1.5s ease-in-out infinite",
          }}
        />
        <span
          className="text-[10px]"
          style={{
            color: "oklch(0.52 0 0)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          KEY: {currentKey} · {currentScale.toUpperCase()}
        </span>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
