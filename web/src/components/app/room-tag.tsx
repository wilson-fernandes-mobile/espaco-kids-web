import { QRCodeSVG } from "qrcode.react";
import { AppLogo } from "@/components/app/app-logo";
import type { ClassRoom } from "@/lib/domain/types";

/** Conteúdo do QR da sala: o app da equipe lê e faz o check-in na sala. */
export const roomTagValue = (churchId: string, classId: string) =>
  `EKT:${churchId}:${classId}`;

/**
 * Etiqueta da sala (Brother 29×90 mm, DK-11201): a equipe lê o QR no app para
 * fazer check-in na sala e os pais passam a ver quem está com as crianças.
 */
export function RoomTag({
  cls,
  churchId,
  churchName,
  logoUrl,
}: {
  cls: ClassRoom;
  churchId: string;
  churchName?: string;
  /** Logo definida pela igreja em Configurações; sem ela, usa o ícone do app. */
  logoUrl?: string;
}) {
  return (
    <div
      className="badge-card relative flex h-[29mm] w-[90mm] items-center gap-2 overflow-hidden border border-slate-800 bg-white px-[2mm] py-[1.5mm] text-black"
      style={{ breakInside: "avoid" }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1mm]">
        <div className="flex items-center gap-1 text-[6pt] font-bold uppercase leading-none">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-[3mm] w-[3mm] shrink-0 object-contain"
            />
          ) : (
            <AppLogo className="h-[3mm] w-[3mm]" />
          )}
          <span className="truncate">
            {churchName ? `${churchName} · Espaço Kids` : "Espaço Kids"}
          </span>
        </div>
        <h2 className="truncate text-[16pt] font-extrabold leading-none">
          {cls.name}
        </h2>
        {cls.room && (
          <p className="truncate text-[8pt] leading-none text-slate-700">
            {cls.room}
          </p>
        )}
        <p className="text-[6pt] leading-tight text-slate-700">
          Equipe: leia no app para entrar na sala
        </p>
      </div>
      <QRCodeSVG
        value={roomTagValue(churchId, cls.id)}
        level="M"
        marginSize={0}
        className="h-[24mm] w-[24mm] shrink-0"
      />
    </div>
  );
}
