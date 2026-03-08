import { Mic, MicOff, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface MicPermissionModalProps {
  onGranted: () => void;
  onDismiss: () => void;
}

type Status = "idle" | "requesting" | "granted" | "denied";

export function MicPermissionModal({
  onGranted,
  onDismiss,
}: MicPermissionModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-request after brief delay for better UX
  useEffect(() => {
    const timer = setTimeout(() => {}, 300);
    return () => clearTimeout(timer);
  }, []);

  const requestPermission = async () => {
    setStatus("requesting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      // Stop tracks immediately — we only needed permission
      for (const track of stream.getTracks()) {
        track.stop();
      }
      localStorage.setItem("mic_permission_granted", "1");
      setStatus("granted");
      setTimeout(onGranted, 600);
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setErrorMsg("Permissão negada. Gravação não disponível.");
      } else if (e.name === "NotFoundError") {
        setErrorMsg("Nenhum microfone encontrado neste dispositivo.");
      } else {
        setErrorMsg(`Erro ao aceder ao microfone: ${e.message}`);
      }
      setStatus("denied");
    }
  };

  return (
    <div
      data-ocid="mic_permission.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
    >
      {/* Dismiss button (top right) */}
      <button
        type="button"
        className="absolute top-4 right-4 flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          background: "oklch(0.18 0 0)",
          border: "1px solid oklch(0.28 0 0)",
          color: "oklch(0.45 0 0)",
          cursor: "pointer",
        }}
        onClick={onDismiss}
        title="Ignorar"
      >
        <X size={14} />
      </button>

      <div
        className="flex flex-col items-center gap-6 rounded-2xl p-8 mx-4"
        style={{
          maxWidth: 420,
          width: "100%",
          background: "oklch(0.13 0 0)",
          border: "1px solid oklch(0.25 0 0)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.9), 0 0 40px oklch(0.78 0.15 195 / 0.08)",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 80,
            height: 80,
            background:
              status === "granted"
                ? "oklch(0.72 0.20 145 / 0.15)"
                : status === "denied"
                  ? "oklch(0.62 0.22 25 / 0.15)"
                  : "oklch(0.78 0.15 195 / 0.15)",
            border: `2px solid ${
              status === "granted"
                ? "oklch(0.72 0.20 145 / 0.5)"
                : status === "denied"
                  ? "oklch(0.62 0.22 25 / 0.5)"
                  : "oklch(0.78 0.15 195 / 0.5)"
            }`,
            transition: "all 0.3s ease",
          }}
        >
          {status === "denied" ? (
            <MicOff size={36} style={{ color: "oklch(0.62 0.22 25)" }} />
          ) : (
            <Mic
              size={36}
              style={{
                color:
                  status === "granted"
                    ? "oklch(0.72 0.20 145)"
                    : "oklch(0.78 0.15 195)",
              }}
            />
          )}
        </div>

        {/* Title */}
        <div className="text-center">
          <h2
            className="font-semibold mb-2"
            style={{
              fontSize: 22,
              color: "oklch(0.92 0 0)",
              fontFamily: "Sora, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {status === "granted"
              ? "Microfone Autorizado!"
              : status === "denied"
                ? "Acesso Negado"
                : "Permitir Microfone"}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "oklch(0.55 0 0)", maxWidth: 320 }}
          >
            {status === "denied"
              ? errorMsg
              : status === "granted"
                ? "Tudo pronto! A gravação de alta qualidade está disponível."
                : "O Pro Music DAW precisa de acesso ao microfone para gravação de voz em alta qualidade com supressão de ruído."}
          </p>
        </div>

        {/* Features list */}
        {status === "idle" || status === "requesting" ? (
          <div
            className="w-full rounded-xl p-4 flex flex-col gap-2"
            style={{
              background: "oklch(0.10 0 0)",
              border: "1px solid oklch(0.20 0 0)",
            }}
          >
            {[
              "Supressão de ruído avançada",
              "Taxa de amostragem 48kHz",
              "Captura de voz otimizada",
              "Gravação simultânea com beat",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-xs"
                style={{ color: "oklch(0.60 0 0)" }}
              >
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: 5,
                    height: 5,
                    background: "oklch(0.78 0.15 195)",
                  }}
                />
                {feature}
              </div>
            ))}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full">
          {status !== "granted" && (
            <button
              type="button"
              data-ocid="mic_permission.primary_button"
              className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold transition-all"
              style={{
                height: 48,
                fontSize: 15,
                background:
                  status === "requesting"
                    ? "oklch(0.35 0.10 195)"
                    : status === "denied"
                      ? "oklch(0.22 0 0)"
                      : "oklch(0.78 0.15 195)",
                color:
                  status === "requesting"
                    ? "oklch(0.65 0 0)"
                    : status === "denied"
                      ? "oklch(0.60 0 0)"
                      : "oklch(0.10 0 0)",
                border: "none",
                cursor: status === "requesting" ? "wait" : "pointer",
              }}
              onClick={requestPermission}
              disabled={status === "requesting"}
            >
              {status === "requesting" ? (
                <>
                  <RefreshCw
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  A solicitar acesso…
                </>
              ) : status === "denied" ? (
                <>
                  <RefreshCw size={16} />
                  Tentar Novamente
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Permitir Acesso
                </>
              )}
            </button>
          )}

          <button
            type="button"
            data-ocid="mic_permission.cancel_button"
            className="w-full flex items-center justify-center rounded-xl text-sm transition-all"
            style={{
              height: 40,
              background: "transparent",
              color: "oklch(0.40 0 0)",
              border: "1px solid oklch(0.20 0 0)",
              cursor: "pointer",
            }}
            onClick={onDismiss}
          >
            {status === "denied"
              ? "Continuar sem microfone"
              : "Ignorar por agora"}
          </button>
        </div>

        {/* Footer note */}
        <p
          className="text-center text-[10px] leading-relaxed"
          style={{ color: "oklch(0.32 0 0)" }}
        >
          Pode alterar esta permissão nas definições do navegador a qualquer
          momento.
        </p>
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
