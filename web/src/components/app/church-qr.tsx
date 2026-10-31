import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Conteúdo do QR de entrada: o app lê, extrai o código (IG-/KIDS-) e preenche o cadastro. */
export const churchCodeValue = (code: string) => `EKC:${code}`;

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
