import {
  Activity,
  AlertTriangle,
  Cpu,
  Mic,
  Speaker,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DAWState } from "../hooks/useDAWState";

interface SettingsPanelProps {
  state: DAWState;
  onClearProject: () => void;
}

const APP_VERSION = "2.0.0";

export function SettingsPanel({ state, onClearProject }: SettingsPanelProps) {
  const [latencyResult, setLatencyResult] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>("");
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>("");
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bufferSize, setBufferSize] = useState<number>(256);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Enumerate devices
  useEffect(() => {
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setInputDevices(devices.filter((d) => d.kind === "audioinput"));
        setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      } catch {
        // permission not yet granted
      }
    };
    enumerate();
  }, []);

  // Get sample rate from existing audio context
  useEffect(() => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      setSampleRate(ctx.sampleRate);
      audioCtxRef.current = ctx;
    } catch {
      // not supported
    }
    return () => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, []);

  const handleLatencyTest = useCallback(async () => {
    setIsTestingLatency(true);
    setLatencyResult(null);
    try {
      const ctx = new AudioContext();
      await ctx.resume();

      // Measure output latency using AudioContext's built-in outputLatency
      const builtinLatency = (ctx.outputLatency ?? 0) * 1000;

      // Additional: measure round-trip time by scheduling a click and checking timing
      const oscStartTime = ctx.currentTime + 0.1;
      const tStart = performance.now();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // silent, just measuring scheduling delay
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(oscStartTime);
      osc.stop(oscStartTime + 0.01);

      // Wait for the scheduled time
      await new Promise<void>((resolve) => {
        const check = () => {
          if (ctx.currentTime >= oscStartTime + 0.01) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });

      const tEnd = performance.now();
      const schedulingDelay = tEnd - tStart - 110; // subtract the 110ms we scheduled ahead
      const totalLatency = Math.max(
        0,
        builtinLatency + Math.abs(schedulingDelay),
      );

      setSampleRate(ctx.sampleRate);
      setLatencyResult(Math.round(totalLatency));
      ctx.close();
    } catch (e) {
      console.error("Latency test failed:", e);
      setLatencyResult(-1);
    } finally {
      setIsTestingLatency(false);
    }
  }, []);

  const row = (label: string, content: React.ReactNode) => (
    <div
      className="flex items-center justify-between py-2 border-b"
      style={{ borderColor: "oklch(0.18 0 0)" }}
    >
      <span className="text-[11px]" style={{ color: "oklch(0.55 0 0)" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">{content}</div>
    </div>
  );

  return (
    <div
      data-ocid="settings.panel"
      className="h-full overflow-y-auto"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <div
        className="grid grid-cols-2 gap-0 h-full divide-x"
        style={{ borderColor: "oklch(0.18 0 0)" }}
      >
        {/* Left column — Audio & Latency */}
        <div className="p-3 overflow-y-auto">
          {/* Section: Latency */}
          <div className="mb-3">
            <div
              className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest"
              style={{ color: "oklch(0.45 0 0)" }}
            >
              <Activity size={10} />
              Latency
            </div>

            {row(
              "Latency Test",
              <div className="flex items-center gap-2">
                {latencyResult !== null && latencyResult >= 0 && (
                  <span
                    className="text-xs font-mono"
                    style={{
                      color:
                        latencyResult < 10
                          ? "oklch(0.72 0.20 145)"
                          : latencyResult < 30
                            ? "oklch(0.82 0.18 85)"
                            : "oklch(0.62 0.22 25)",
                    }}
                  >
                    {latencyResult} ms
                  </span>
                )}
                {latencyResult === -1 && (
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.62 0.22 25)" }}
                  >
                    Failed
                  </span>
                )}
                <button
                  type="button"
                  data-ocid="settings.primary_button"
                  onClick={handleLatencyTest}
                  disabled={isTestingLatency}
                  className="rounded px-2 py-0.5 text-[10px] transition-all"
                  style={{
                    background: isTestingLatency
                      ? "oklch(0.20 0 0)"
                      : "oklch(0.78 0.15 195 / 0.2)",
                    color: isTestingLatency
                      ? "oklch(0.40 0 0)"
                      : "oklch(0.78 0.15 195)",
                    border: `1px solid ${isTestingLatency ? "oklch(0.24 0 0)" : "oklch(0.78 0.15 195 / 0.4)"}`,
                    cursor: isTestingLatency ? "not-allowed" : "pointer",
                  }}
                >
                  {isTestingLatency ? "Testing..." : "Run Test"}
                </button>
              </div>,
            )}

            {row(
              "Buffer Size",
              <select
                data-ocid="settings.select"
                value={bufferSize}
                onChange={(e) => setBufferSize(Number(e.target.value))}
                className="rounded text-[10px] px-1"
                style={{
                  background: "oklch(0.18 0 0)",
                  color: "oklch(0.80 0 0)",
                  border: "1px solid oklch(0.28 0 0)",
                  height: 22,
                  outline: "none",
                }}
              >
                {[128, 256, 512, 1024, 2048].map((n) => (
                  <option key={n} value={n}>
                    {n} samples
                  </option>
                ))}
              </select>,
            )}

            {row(
              "Sample Rate",
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {sampleRate.toLocaleString()} Hz
              </span>,
            )}
          </div>

          {/* Section: Devices */}
          <div>
            <div
              className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest"
              style={{ color: "oklch(0.45 0 0)" }}
            >
              <Mic size={10} />
              Input Device
            </div>

            {row(
              "Microphone",
              <select
                data-ocid="settings.input.select"
                value={selectedInputDevice}
                onChange={(e) => setSelectedInputDevice(e.target.value)}
                className="rounded text-[10px] px-1"
                style={{
                  background: "oklch(0.18 0 0)",
                  color: "oklch(0.80 0 0)",
                  border: "1px solid oklch(0.28 0 0)",
                  height: 22,
                  maxWidth: 160,
                  outline: "none",
                }}
              >
                <option value="">Default</option>
                {inputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>,
            )}

            <div className="mt-3">
              <div
                className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest"
                style={{ color: "oklch(0.45 0 0)" }}
              >
                <Speaker size={10} />
                Output Device
              </div>

              {row(
                "Speaker / Headphones",
                <select
                  data-ocid="settings.output.select"
                  value={selectedOutputDevice}
                  onChange={(e) => setSelectedOutputDevice(e.target.value)}
                  className="rounded text-[10px] px-1"
                  style={{
                    background: "oklch(0.18 0 0)",
                    color: "oklch(0.80 0 0)",
                    border: "1px solid oklch(0.28 0 0)",
                    height: 22,
                    maxWidth: 160,
                    outline: "none",
                  }}
                >
                  <option value="">Default</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speaker ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>,
              )}
            </div>
          </div>
        </div>

        {/* Right column — Project & App info */}
        <div className="p-3 overflow-y-auto">
          <div className="mb-3">
            <div
              className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest"
              style={{ color: "oklch(0.45 0 0)" }}
            >
              <Cpu size={10} />
              Project
            </div>

            {row(
              "Project Name",
              <span
                className="text-[11px]"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {state.project.name}
              </span>,
            )}
            {row(
              "BPM",
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {state.project.bpm}
              </span>,
            )}
            {row(
              "Time Signature",
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {state.project.timeSignatureNumerator}/
                {state.project.timeSignatureDenominator}
              </span>,
            )}
            {row(
              "Tracks",
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {state.tracks.length}
              </span>,
            )}
            {row(
              "Total FX Slots",
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.70 0 0)" }}
              >
                {state.tracks.reduce(
                  (acc, t) => acc + t.effectsChain.length,
                  0,
                ) + state.masterFXChain.length}
              </span>,
            )}
          </div>

          <div
            className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest"
            style={{ color: "oklch(0.45 0 0)" }}
          >
            <AlertTriangle size={10} />
            Danger Zone
          </div>

          {showClearConfirm ? (
            <div
              className="rounded p-2 flex flex-col gap-2"
              style={{
                background: "oklch(0.62 0.22 25 / 0.15)",
                border: "1px solid oklch(0.62 0.22 25 / 0.4)",
              }}
            >
              <span
                className="text-[10px]"
                style={{ color: "oklch(0.72 0.18 25)" }}
              >
                This will delete all tracks, clips, and effects. Are you sure?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="settings.confirm_button"
                  onClick={() => {
                    onClearProject();
                    setShowClearConfirm(false);
                  }}
                  className="rounded px-2 py-1 text-[10px] font-semibold transition-all"
                  style={{
                    background: "oklch(0.62 0.22 25)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Yes, Clear Project
                </button>
                <button
                  type="button"
                  data-ocid="settings.cancel_button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded px-2 py-1 text-[10px] transition-all"
                  style={{
                    background: "oklch(0.20 0 0)",
                    color: "oklch(0.60 0 0)",
                    border: "1px solid oklch(0.28 0 0)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="settings.delete_button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] transition-all"
              style={{
                background: "oklch(0.62 0.22 25 / 0.15)",
                color: "oklch(0.72 0.18 25)",
                border: "1px solid oklch(0.62 0.22 25 / 0.4)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={11} />
              Clear Project
            </button>
          )}

          <div
            className="mt-4 pt-3 border-t text-[10px]"
            style={{
              borderColor: "oklch(0.18 0 0)",
              color: "oklch(0.38 0 0)",
            }}
          >
            <div>Pro Music DAW Studio</div>
            <div style={{ color: "oklch(0.30 0 0)" }}>
              v{APP_VERSION} · Web Audio API
            </div>
            <div className="mt-1" style={{ color: "oklch(0.30 0 0)" }}>
              Built with caffeine.ai
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
