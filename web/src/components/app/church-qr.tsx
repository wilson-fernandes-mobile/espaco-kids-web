import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

/** Conteúdo do QR de entrada: o app lê, extrai o código (IG-/KIDS-) e preenche o cadastro. */
export const churchCodeValue = (code: string) => `EKC:${code}`;

/**
 * Etiqueta 90×29 mm (Brother DK-11201) com o QR e o código de entrada:
 * "Código de entrada dos pais" ou "Código de convite da equipe".
 */
export function CodeLabel({
  code,
  title,
  hint,
  churchName,
  logoUrl,
}: {
  code: string;
  title: string;
  hint: string;
  churchName?: string;
  logoUrl?: string;
}) {
  return (
    <div
      className="badge-card flex h-[29mm] w-[90mm] items-center gap-2 overflow-hidden border border-slate-800 bg-white px-[2mm] py-[1.5mm] text-black"
      style={{ breakInside: "avoid" }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1mm]">
        <div className="flex items-center gap-1 text-[6pt] font-bold uppercase leading-none">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-[3mm] w-[3mm] shrink-0 object-contain"
            />
          )}
          <span className="truncate">{churchName ?? "Espaço Kids"}</span>
        </div>
        <p className="text-[9pt] font-extrabold leading-tight">{title}</p>
        <p className="font-mono text-[13pt] font-bold leading-none tracking-wider">
          {code}
        </p>
        <p className="text-[5.5pt] leading-tight text-slate-700">{hint}</p>
      </div>
      <QRCodeCanvas
        value={churchCodeValue(code)}
        size={256}
        level="M"
        marginSize={0}
        className="!h-[24mm] !w-[24mm] shrink-0"
      />
    </div>
  );
}

export interface CodeLabelData {
  code: string;
  title: string;
  hint: string;
}

/** Botão "Imprimir etiqueta" (a página cuida da área de impressão). */
export function PrintCodeLabelButton({ onPrint }: { onPrint: () => void }) {
  return (
    <Button variant="outline" onClick={onPrint}>
      <Printer /> Imprimir etiqueta
    </Button>
  );
}

/**
 * Área de impressão: só a etiqueta do código. Deve ficar FORA do conteúdo da
 * página, que precisa estar dentro de um bloco `no-print`.
 */
export function CodeLabelSheet({ label }: { label: CodeLabelData | null }) {
  const { state } = useStore();
  if (!label) return null;
  return (
    <div className="print-only">
      <div className="print-sheet">
        <CodeLabel
          {...label}
          churchName={state.settings.name || undefined}
          logoUrl={state.settings.logoUrl || undefined}
        />
      </div>
    </div>
  );
}

/** Imprime a etiqueta: monta a área, abre a impressão e desmonta. */
export function usePrintCodeLabel() {
  const [label, setLabel] = useState<CodeLabelData | null>(null);
  const print = (l: CodeLabelData) => {
    setLabel(l);
    setTimeout(() => {
      window.print();
      setLabel(null);
    }, 150);
  };
  return { label, print };
}

/** QR do código da igreja, com opção de baixar a imagem para imprimir/compartilhar. */
export function ChurchQr({
  code,
  churchName,
  size = 180,
}: {
  code: string;
  churchName?: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const download = () => {
    const url = ref.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode-${code}.png`;
    a.click();
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border bg-white p-3">
        <QRCodeCanvas
          ref={ref}
          value={churchCodeValue(code)}
          size={size}
          level="M"
          marginSize={1}
          aria-label={`QR Code de entrada${churchName ? ` da ${churchName}` : ""}`}
        />
      </div>
      <Button variant="outline" size="sm" onClick={download}>
        <Download /> Baixar QR Code
      </Button>
    </div>
  );
}
