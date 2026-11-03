import { QRCodeSVG } from "qrcode.react";
import { Church } from "lucide-react";
import { cn } from "@/lib/utils";
import { QR_PREFIX } from "@/components/app/qr-scanner";
import type {
  Badge,
  Child,
  ChurchSettings,
  ClassRoom,
  Family,
} from "@/lib/domain/types";

/**
 * Crachá imprimível, pensado para etiqueta Brother 29×90 mm (DK-11201,
 * impressora QL-800). O QR contém só um token opaco e aleatório — nenhum dado
 * pessoal. Em tamanhos maiores o layout se mantém, apenas com mais espaço.
 */
export function BadgeCard({
  child,
  badge,
  cls,
  family,
  settings,
  className,
}: {
  child: Child;
  badge: Badge;
  cls?: ClassRoom;
  family?: Family;
  settings: ChurchSettings;
  className?: string;
}) {
  const { widthMm, heightMm, showClass, showFamily } = settings.badge;
  const inactive = badge.status !== "ativo";
  return (
    <div
      className={cn(
        "badge-card relative flex overflow-hidden border border-slate-800 bg-white text-slate-900",
        className,
      )}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between px-[2mm] py-[1.5mm]">
        <div className="flex items-center gap-1 text-[6pt] font-bold uppercase leading-none tracking-wide">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt=""
              className="h-[3mm] w-[3mm] object-contain"
            />
          ) : (
            <Church className="h-[3mm] w-[3mm]" />
          )}
          <span className="truncate">{settings.name}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13pt] font-extrabold leading-none">
            {child.nickname}
          </p>
          <p className="mt-[0.5mm] truncate text-[6.5pt] leading-none text-slate-700">
            {child.fullName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[7pt] leading-none">
          <span className="font-mono font-bold">{child.code}</span>
          {showFamily && family && (
            <span className="truncate text-slate-700">· Fam. {family.code}</span>
          )}
          {showClass && cls && (
            <span className="truncate rounded-sm border border-slate-800 px-1 py-px font-bold">
              {cls.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center p-[1.5mm]">
        <QRCodeSVG
          value={`${QR_PREFIX}${badge.token}`}
          level="M"
          marginSize={0}
          style={{ height: `${Math.max(heightMm - 5, 10)}mm`, width: "auto", aspectRatio: "1" }}
        />
      </div>
      {inactive && (
        <div className="absolute inset-0 grid place-items-center bg-white/75">
          <span className="-rotate-12 rounded border-2 border-destructive px-2 py-0.5 text-sm font-black uppercase text-destructive">
            {badge.status}
          </span>
        </div>
      )}
    </div>
  );
}
