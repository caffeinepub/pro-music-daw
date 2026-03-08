import { useEffect, useRef } from "react";

interface SpectrumAnalyzerProps {
  getSpectrumData: () => Float32Array | null;
}

export function SpectrumAnalyzer({ getSpectrumData }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      const gridFreqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      const sampleRate = 44100;

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      for (const freq of gridFreqs) {
        const logPos = Math.log10(freq / 20) / Math.log10(20000 / 20);
        const x = logPos * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 20);
        ctx.stroke();
      }

      // dB grid lines
      const dbLevels = [-60, -48, -36, -24, -12, -6, 0];
      for (const db of dbLevels) {
        const y = h - 20 - ((db + 80) / 80) * (h - 20);
        ctx.strokeStyle =
          db === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      const data = getSpectrumData();

      if (data) {
        const nyquist = sampleRate / 2;
        const bufferLength = data.length;

        // Draw spectrum curve
        ctx.beginPath();
        let started = false;

        for (let i = 0; i < bufferLength; i++) {
          const freq = (i / bufferLength) * nyquist;
          if (freq < 20) continue;

          const logPos = Math.log10(freq / 20) / Math.log10(20000 / 20);
          const x = logPos * w;
          if (x < 0 || x > w) continue;

          const db = data[i];
          const normalizedDb = Math.max(0, (db + 80) / 80);
          const y = h - 20 - normalizedDb * (h - 20);

          if (!started) {
            ctx.moveTo(x, h - 20);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(w, h - 20);
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, "oklch(0.78 0.15 195 / 0.8)");
        gradient.addColorStop(0.4, "oklch(0.72 0.20 145 / 0.6)");
        gradient.addColorStop(0.7, "oklch(0.72 0.20 145 / 0.3)");
        gradient.addColorStop(1, "oklch(0.72 0.20 145 / 0.05)");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Spectrum line on top
        ctx.beginPath();
        started = false;
        for (let i = 0; i < bufferLength; i++) {
          const freq = (i / bufferLength) * nyquist;
          if (freq < 20) continue;
          const logPos = Math.log10(freq / 20) / Math.log10(20000 / 20);
          const x = logPos * w;
          if (x < 0 || x > w) continue;
          const db = data[i];
          const normalizedDb = Math.max(0, (db + 80) / 80);
          const y = h - 20 - normalizedDb * (h - 20);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = "oklch(0.85 0.15 195)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // No audio - draw idle line
        ctx.beginPath();
        ctx.moveTo(0, h - 20);
        for (let x = 0; x <= w; x += 2) {
          const noise = (Math.random() - 0.5) * 3;
          ctx.lineTo(x, h - 20 + noise);
        }
        ctx.strokeStyle = "oklch(0.78 0.15 195 / 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Frequency labels
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillStyle = "oklch(0.38 0 0)";

      const labelFreqs: [number, string][] = [
        [20, "20"],
        [50, "50"],
        [100, "100"],
        [200, "200"],
        [500, "500"],
        [1000, "1k"],
        [2000, "2k"],
        [5000, "5k"],
        [10000, "10k"],
        [20000, "20k"],
      ];

      for (const [freq, label] of labelFreqs) {
        const logPos = Math.log10(freq / 20) / Math.log10(20000 / 20);
        const x = logPos * w;
        if (x < 0 || x > w - 20) continue;
        ctx.fillText(label, x, h - 4);
      }

      // dB labels
      ctx.textAlign = "right";
      for (const db of [-60, -48, -36, -24, -12, -6]) {
        const y = h - 20 - ((db + 80) / 80) * (h - 20);
        ctx.fillText(`${db}`, 28, y + 3);
      }
      ctx.textAlign = "left";

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getSpectrumData]);

  return (
    <div
      data-ocid="analyzer.panel"
      ref={containerRef}
      className="flex flex-col h-full"
      style={{ background: "#0a0a0a" }}
    >
      <div
        className="shrink-0 px-3 py-1.5 border-b flex items-center gap-3"
        style={{
          borderColor: "oklch(0.18 0 0)",
          background: "oklch(0.12 0 0)",
        }}
      >
        <span
          className="text-[10px] font-medium"
          style={{ color: "oklch(0.55 0 0)" }}
        >
          Spectrum Analyzer
        </span>
        <span className="text-[10px]" style={{ color: "oklch(0.35 0 0)" }}>
          20 Hz – 20 kHz · Real-time FFT
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <div
            className="rounded-full"
            style={{ width: 6, height: 6, background: "oklch(0.72 0.20 145)" }}
          />
          <span className="text-[9px]" style={{ color: "oklch(0.42 0 0)" }}>
            Master Output
          </span>
        </div>
      </div>

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
