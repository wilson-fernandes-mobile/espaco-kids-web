// Leitor de QR Code pela câmera (jsQR). Devolve apenas o texto lido; quem chama decide o que fazer.
// A leitura NUNCA libera retirada: apenas localiza o cadastro (a validação ocorre no check-out).
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";

export const QR_PREFIX = "EK:";

/** Extrai o token opaco do conteúdo do QR (aceita o prefixo EK: ou o token puro). */
export function parseQr(text: string) {
  const t = text.trim();
  return t.startsWith(QR_PREFIX) ? t.slice(QR_PREFIX.length) : t;
}

export function QrScanner({
  onResult,
  active = true,
}: {
  onResult: (text: string) => void;
  active?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<
    "starting" | "on" | "denied" | "unsupported"
  >("starting");
  const done = useRef(false);
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    if (!active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    done.current = false;
    let stream: MediaStream | undefined;
    let raf = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const tick = () => {
      const v = video.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA && !done.current) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          done.current = true;
          cb.current(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play();
        }
        setState("on");
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setState("denied"));

    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  if (state === "denied" || state === "unsupported")
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/50 p-8 text-center text-sm text-muted-foreground">
        <CameraOff className="size-8" />
        <p className="font-medium text-foreground">
          {state === "denied"
            ? "Acesso à câmera negado"
            : "Câmera indisponível neste navegador"}
        </p>
        <p>
          Libere a câmera nas permissões do navegador (requer HTTPS) ou pesquise
          pelo nome ou código.
        </p>
      </div>
    );
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={video}
        playsInline
        muted
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-48 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      {state === "starting" && (
        <div className="absolute inset-0 grid place-items-center text-white">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
    </div>
  );
}

export function ScanToggle({ onResult }: { onResult: (text: string) => void }) {
  const [on, setOn] = useState(false);
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={on ? "secondary" : "outline"}
        onClick={() => setOn((v) => !v)}
      >
        <Camera /> {on ? "Fechar câmera" : "Ler QR Code"}
      </Button>
      {on && (
        <QrScanner
          onResult={(t) => {
            setOn(false);
            onResult(t);
          }}
        />
      )}
    </div>
  );
}
