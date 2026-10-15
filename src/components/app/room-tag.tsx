import { QRCodeSVG } from "qrcode.react";
import { AppLogo } from "@/components/app/app-logo";
import type { ClassRoom } from "@/lib/domain/types";

/** Conteúdo do QR da sala: o app da equipe lê e faz o check-in na sala. */
export const roomTagValue = (churchId: string, classId: string) =>
  `EKT:${churchId}:${classId}`;

/**
 * Etiqueta da sala para colar na porta: a equipe lê o QR no app para fazer
 * check-in na sala e os pais passam a ver quem está com as crianças.
 */
export function RoomTag({
  cls,
  churchId,
  churchName,
}: {
  cls: ClassRoom;
  churchId: string;
  churchName?: string;
}) {
  return (
    <div
      className="badge-card flex w-[100mm] flex-col items-center gap-3 rounded-2xl border-2 border-primary bg-white p-6 text-center text-black"
      style={{ breakInside: "avoid" }}
    >
      <div className="flex items-center gap-2">
        <AppLogo className="size-8" />
        <span className="text-sm font-bold">
          {churchName ? `${churchName} · Espaço Kids` : "Espaço Kids"}
        </span>
      </div>
      <h2 className="text-3xl font-extrabold leading-tight">{cls.name}</h2>
      {cls.room && <p className="-mt-2 text-base text-gray-600">{cls.room}</p>}
      <QRCodeSVG
        value={roomTagValue(churchId, cls.id)}
        size={220}
        level="M"
        marginSize={1}
      />
      <p className="text-sm font-semibold">Equipe: leia no app para entrar na sala</p>
      <p className="text-xs text-gray-500">
        Espaço Kids › Ler crachá ou sala
      </p>
    </div>
  );
}
