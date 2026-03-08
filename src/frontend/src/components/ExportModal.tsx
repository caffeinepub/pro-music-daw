import { Check, Download, FileAudio, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { DAWProject, DAWTrack } from "../types/daw";

interface ExportModalProps {
  tracks: DAWTrack[];
  project: DAWProject;
  onExportWav: () => Promise<void>;
  onImportFile: (file: File) => void;
  onClose: () => void;
}

type ExportFormat = "wav" | "webm" | "ogg" | "mp3" | "aac";
type Quality = "low" | "medium" | "high";

interface FormatDef {
  id: ExportFormat;
  label: string;
  ext: string;
  mimeType: string;
  lossy: boolean;
  description: string;
}

const FORMATS: FormatDef[] = [
  {
    id: "wav",
    label: "WAV",
    ext: ".wav",
    mimeType: "audio/wav",
    lossy: false,
    description: "Sem perdas · Alta qualidade · Universal",
  },
  {
    id: "webm",
    label: "WebM/Opus",
    ext: ".webm",
    mimeType: "audio/webm;codecs=opus",
    lossy: true,
    description: "Comprimido · Web optimizado",
  },
  {
    id: "ogg",
    label: "OGG Vorbis",
    ext: ".ogg",
    mimeType: "audio/ogg;codecs=opus",
    lossy: true,
    description: "Open source · Boa compressão",
  },
  {
    id: "mp3",
    label: "MP3",
    ext: ".mp3",
    mimeType: "audio/mpeg",
    lossy: true,
    description: "Formato mais popular",
  },
  {
    id: "aac",
    label: "AAC / M4A",
    ext: ".aac",
    mimeType: "audio/mp4",
    lossy: true,
    description: "Apple / streaming",
  },
];

const QUALITY_OPTS: { id: Quality; label: string; kbps: number }[] = [
  { id: "low", label: "Baixa (96kbps)", kbps: 96000 },
  { id: "medium", label: "Média (192kbps)", kbps: 192000 },
  { id: "high", label: "Alta (320kbps)", kbps: 320000 },
];

function isFormatSupported(mimeType: string): boolean {
  if (mimeType === "audio/wav") return true;
  if (typeof MediaRecorder === "undefined") return false;
  return MediaRecorder.isTypeSupported(mimeType);
}

export function ExportModal({
  tracks,
  project,
  onExportWav,
  onImportFile,
  onClose,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("wav");
  const [quality, setQuality] = useState<Quality>("high");
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const fmt = FORMATS.find((f) => f.id === selectedFormat)!;
  const supported = isFormatSupported(fmt.mimeType);
  const hasTracks = tracks.some((t) => t.audioBuffer);

  const handleExport = async () => {
    if (!hasTracks) {
      toast.error("Nenhuma faixa com áudio para exportar");
      return;
    }

    setIsExporting(true);
    setExported(false);

    try {
      if (selectedFormat === "wav") {
        await onExportWav();
        setExported(true);
      } else {
        // Use MediaRecorder for non-WAV formats
        const bestMime = isFormatSupported(fmt.mimeType)
          ? fmt.mimeType
          : "audio/webm;codecs=opus";

        const ext = isFormatSupported(fmt.mimeType) ? fmt.ext : ".webm";
        const kbps = QUALITY_OPTS.find((q) => q.id === quality)?.kbps ?? 192000;

        toast(`A exportar em ${fmt.label}…`);

        // Create an offline render then record it via MediaRecorder
        const ctx = new AudioContext();
        const chunks: Blob[] = [];

        // Build offline context from tracks
        const durationBeats = Math.max(
          16,
          ...tracks
            .filter((t) => t.audioBuffer)
            .map((t) => (t.audioBuffer!.duration * project.bpm) / 60),
        );
        const sampleRate = 44100;
        const durationSeconds = (durationBeats / project.bpm) * 60;
        const offlineCtx = new OfflineAudioContext(
          2,
          sampleRate * durationSeconds,
          sampleRate,
        );
        const masterGain = offlineCtx.createGain();
        masterGain.gain.value = 0.85;
        masterGain.connect(offlineCtx.destination);

        for (const track of tracks) {
          if (!track.audioBuffer || track.muted) continue;
          const source = offlineCtx.createBufferSource();
          source.buffer = track.audioBuffer;
          const gain = offlineCtx.createGain();
          gain.gain.value = track.volume;
          const panner = offlineCtx.createStereoPanner();
          panner.pan.value = track.pan;
          source.connect(gain);
          gain.connect(panner);
          panner.connect(masterGain);
          source.start(0);
        }

        const rendered = await offlineCtx.startRendering();

        // Play through MediaRecorder
        const streamDest = ctx.createMediaStreamDestination();
        const playSource = ctx.createBufferSource();
        playSource.buffer = rendered;
        const playGain = ctx.createGain();
        playGain.gain.value = 1;
        playSource.connect(playGain);
        playGain.connect(streamDest);

        const recorder = new MediaRecorder(streamDest.stream, {
          mimeType: bestMime,
          audioBitsPerSecond: kbps,
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.start(100);
          playSource.start();
          playSource.onended = () => {
            recorder.stop();
            ctx.close();
          };
        });

        const blob = new Blob(chunks, { type: bestMime.split(";")[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, "_")}_export${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        setExported(true);
        toast.success(`Exportado como ${fmt.label}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha na exportação");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      onImportFile(file);
      toast.success(`Importado: ${file.name}`);
    }
    e.target.value = "";
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        data-ocid="export.modal"
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: 500,
          maxHeight: "88vh",
          background: "oklch(0.13 0 0)",
          border: "1px solid oklch(0.25 0 0)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "oklch(0.20 0 0)" }}
        >
          <div className="flex items-center gap-2">
            <FileAudio size={16} style={{ color: "oklch(0.72 0.20 145)" }} />
            <span
              className="font-semibold text-sm"
              style={{ color: "oklch(0.90 0 0)" }}
            >
              Exportar / Importar Projeto
            </span>
          </div>
          <button
            type="button"
            data-ocid="export.close_button"
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 28,
              height: 28,
              background: "oklch(0.20 0 0)",
              color: "oklch(0.50 0 0)",
              border: "1px solid oklch(0.28 0 0)",
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Export section */}
          <div className="p-5 flex flex-col gap-4">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "oklch(0.72 0.20 145)" }}
            >
              ↓ Exportar
            </div>

            {/* Format selector */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "oklch(0.45 0 0)" }}
              >
                Formato
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {FORMATS.map((f) => {
                  const sup = isFormatSupported(f.mimeType);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-ocid={`export.${f.id}.toggle`}
                      className="flex flex-col items-center gap-1 rounded-xl p-2 transition-all"
                      style={{
                        background:
                          selectedFormat === f.id
                            ? "oklch(0.72 0.20 145 / 0.2)"
                            : "oklch(0.17 0 0)",
                        border: `1px solid ${selectedFormat === f.id ? "oklch(0.72 0.20 145 / 0.6)" : "oklch(0.22 0 0)"}`,
                        color:
                          selectedFormat === f.id
                            ? "oklch(0.72 0.20 145)"
                            : sup
                              ? "oklch(0.65 0 0)"
                              : "oklch(0.35 0 0)",
                        cursor: "pointer",
                        opacity: sup ? 1 : 0.5,
                        boxShadow:
                          selectedFormat === f.id
                            ? "0 0 12px oklch(0.72 0.20 145 / 0.2)"
                            : "none",
                      }}
                      onClick={() => setSelectedFormat(f.id)}
                      title={
                        !sup ? "Não suportado neste navegador" : f.description
                      }
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {f.label}
                      </span>
                      {!sup && (
                        <span
                          className="text-[7px]"
                          style={{ color: "oklch(0.35 0 0)" }}
                        >
                          N/A
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px]" style={{ color: "oklch(0.40 0 0)" }}>
                {fmt.description}
                {!supported && (
                  <span style={{ color: "oklch(0.62 0.22 25)" }}>
                    {" "}
                    · Não suportado, será exportado como WebM
                  </span>
                )}
              </p>
            </div>

            {/* Quality (lossy only) */}
            {fmt.lossy && (
              <div className="flex flex-col gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "oklch(0.45 0 0)" }}
                >
                  Qualidade
                </span>
                <div className="flex gap-2">
                  {QUALITY_OPTS.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      data-ocid={`export.quality.${q.id}.toggle`}
                      className="flex-1 rounded-lg text-xs py-1.5 transition-all"
                      style={{
                        background:
                          quality === q.id
                            ? "oklch(0.78 0.15 195 / 0.2)"
                            : "oklch(0.17 0 0)",
                        border: `1px solid ${quality === q.id ? "oklch(0.78 0.15 195 / 0.6)" : "oklch(0.22 0 0)"}`,
                        color:
                          quality === q.id
                            ? "oklch(0.78 0.15 195)"
                            : "oklch(0.55 0 0)",
                        cursor: "pointer",
                      }}
                      onClick={() => setQuality(q.id)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export button */}
            <button
              type="button"
              data-ocid="export.primary_button"
              className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold transition-all"
              style={{
                height: 44,
                fontSize: 14,
                background: exported
                  ? "oklch(0.72 0.20 145 / 0.2)"
                  : isExporting
                    ? "oklch(0.22 0 0)"
                    : "oklch(0.72 0.20 145)",
                color: exported
                  ? "oklch(0.72 0.20 145)"
                  : isExporting
                    ? "oklch(0.55 0 0)"
                    : "oklch(0.10 0 0)",
                border: `1px solid ${exported ? "oklch(0.72 0.20 145 / 0.4)" : "transparent"}`,
                cursor: isExporting ? "wait" : "pointer",
              }}
              onClick={handleExport}
              disabled={isExporting}
            >
              {exported ? (
                <>
                  <Check size={16} />
                  Exportado com sucesso!
                </>
              ) : isExporting ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2px solid oklch(0.40 0 0)",
                      borderTopColor: "oklch(0.72 0.20 145)",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  A exportar…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Exportar como {fmt.label}
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: "oklch(0.18 0 0)",
              margin: "0 20px",
            }}
          />

          {/* Import section */}
          <div className="p-5 flex flex-col gap-4">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "oklch(0.78 0.15 195)" }}
            >
              ↑ Importar
            </div>

            <button
              type="button"
              data-ocid="export.dropzone"
              className="flex flex-col items-center gap-3 rounded-xl p-6 w-full transition-all"
              style={{
                border: "2px dashed oklch(0.28 0 0)",
                background: "oklch(0.10 0 0)",
                cursor: "pointer",
              }}
              onClick={() => importRef.current?.click()}
            >
              <Upload size={24} style={{ color: "oklch(0.45 0 0)" }} />
              <div className="text-center">
                <p className="text-sm" style={{ color: "oklch(0.70 0 0)" }}>
                  Clique para importar ficheiro de áudio
                </p>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "oklch(0.38 0 0)" }}
                >
                  MP3, WAV, OGG, FLAC, AAC, M4A, WebM, Opus
                </p>
              </div>
              <span
                data-ocid="export.upload_button"
                className="rounded-lg px-4 py-1.5 text-xs font-medium"
                style={{
                  background: "oklch(0.78 0.15 195 / 0.15)",
                  border: "1px solid oklch(0.78 0.15 195 / 0.4)",
                  color: "oklch(0.78 0.15 195)",
                }}
              >
                Selecionar ficheiro
              </span>
            </button>

            <input
              ref={importRef}
              type="file"
              accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,.webm,.opus"
              multiple
              style={{ display: "none" }}
              onChange={handleImportChange}
            />

            {/* Supported formats pills */}
            <div className="flex flex-wrap gap-1">
              {["MP3", "WAV", "OGG", "FLAC", "AAC", "M4A", "WebM", "Opus"].map(
                (ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded text-[9px]"
                    style={{
                      background: "oklch(0.18 0 0)",
                      border: "1px solid oklch(0.25 0 0)",
                      color: "oklch(0.52 0 0)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {ext}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
