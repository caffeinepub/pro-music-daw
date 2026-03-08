import { type FXParamDef, type FXSlot, FX_CATALOG } from "../types/daw";
import { Knob } from "./Knob";

interface FXPluginUIProps {
  fx: FXSlot;
  onParamChange: (key: string, value: number | string | boolean) => void;
}

export function FXPluginUI({ fx, onParamChange }: FXPluginUIProps) {
  const def = FX_CATALOG.find((d) => d.type === fx.type);
  if (!def) return null;

  const CATEGORY_COLORS: Record<string, string> = {
    dynamics: "#e8a23c",
    eq: "#4caf7d",
    reverb: "#5b9cf6",
    delay: "#9b7de8",
    modulation: "#e85bb8",
    pitch: "#e85b5b",
    saturation: "#e87c42",
    spatial: "#42c4e8",
    filter: "#4caf7d",
  };

  const color = CATEGORY_COLORS[def.category] ?? "#00b4d8";

  return (
    <div className="flex flex-wrap gap-2 items-end px-1 py-1">
      {def.paramDefs.map((param: FXParamDef) => {
        const val = fx.params[param.key] as number;

        if (param.type === "knob") {
          return (
            <Knob
              key={param.key}
              value={typeof val === "number" ? val : (param.default as number)}
              min={param.min ?? 0}
              max={param.max ?? 1}
              onChange={(v) => onParamChange(param.key, v)}
              size={32}
              color={fx.enabled ? color : "oklch(0.35 0 0)"}
              label={param.label}
              unit={param.unit}
              defaultValue={param.default as number}
            />
          );
        }

        if (param.type === "slider") {
          return (
            <div
              key={param.key}
              className="flex flex-col items-center gap-0.5"
              style={{ minWidth: 28 }}
            >
              <div
                className="text-[8px] text-center"
                style={{
                  color: "oklch(0.40 0 0)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {typeof val === "number" ? val.toFixed(1) : param.default}
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={((param.max ?? 1) - (param.min ?? 0)) / 100}
                value={
                  typeof val === "number" ? val : (param.default as number)
                }
                onChange={(e) =>
                  onParamChange(param.key, Number.parseFloat(e.target.value))
                }
                style={{
                  writingMode: "vertical-lr",
                  direction: "rtl",
                  height: 48,
                  width: 14,
                  cursor: "pointer",
                  WebkitAppearance: "slider-vertical",
                  appearance: "auto",
                }}
              />
              <div
                className="text-[9px] text-center leading-none"
                style={{ color: "oklch(0.40 0 0)" }}
              >
                {param.label}
              </div>
            </div>
          );
        }

        if (param.type === "toggle") {
          return (
            <div key={param.key} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                className="flex items-center justify-center rounded text-[9px]"
                style={{
                  width: 36,
                  height: 18,
                  background: val ? color : "oklch(0.22 0 0)",
                  color: val ? "white" : "oklch(0.45 0 0)",
                  border: `1px solid ${val ? color : "oklch(0.30 0 0)"}`,
                }}
                onClick={() => onParamChange(param.key, !val)}
              >
                {val ? "ON" : "OFF"}
              </button>
              <span className="text-[9px]" style={{ color: "oklch(0.40 0 0)" }}>
                {param.label}
              </span>
            </div>
          );
        }

        return null;
      })}

      {/* Advanced DSP note for certain FX */}
      {[
        "autotune",
        "harmony",
        "vocal_doubler",
        "formant_shifter",
        "vocoder",
        "freq_shifter",
        "ring_mod",
      ].includes(fx.type) && (
        <div
          className="text-[9px] px-2 py-1 rounded self-center"
          style={{
            background: "oklch(0.18 0 0)",
            color: "oklch(0.52 0 0)",
            border: "1px solid oklch(0.25 0 0)",
          }}
        >
          Advanced DSP
        </div>
      )}
    </div>
  );
}
