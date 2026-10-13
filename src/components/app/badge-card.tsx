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

/** Crachá imprimível. O QR contém só um token opaco e aleatório — nenhum dado pessoal. */
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
        "badge-card relative flex overflow-hidden rounded-xl border-2 border-primary/70 bg-white text-slate-900",
        className,
      )}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between p-[3.5mm]">
        <div className="flex items-center gap-1.5 text-[8pt] font-bold uppercase tracking-wide text-primary">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt=""
              className="size-4 object-contain"
            />
          ) : (
            <Church className="size-3.5" />
          )}
          <span className="truncate">{settings.name}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15pt] font-extrabold leading-tight">
            {child.nickname}
          </p>
          <p className="truncate text-[8pt] text-slate-600">{child.fullName}</p>
        </div>
        <div className="space-y-0.5 text-[8pt]">
          <p className="font-mono font-bold">{child.code}</p>
          {showFamily && family && (
            <p className="truncate text-slate-600">Família {family.code}</p>
          )}
          {showClass && cls && (
            <p className="inline-block rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {cls.name}
            </p>
          )}
        </div>
      </div>
      <div className="flex w-[34%] shrink-0 flex-col items-center justify-center gap-1 bg-primary/5 p-[2.5mm]">
        <QRCodeSVG
          value={`${QR_PREFIX}${badge.token}`}
          level="M"
          className="h-auto w-full"
        />
        <p className="text-[6pt] text-slate-500">Ministério Infantil</p>
      </div>
      {inactive && (
        <div className="absolute inset-0 grid place-items-center bg-white/75">
          <span className="-rotate-12 rounded border-4 border-destructive px-3 py-1 text-xl font-black uppercase text-destructive">
            {badge.status}
          </span>
        </div>
      )}
    </div>
  );
}
