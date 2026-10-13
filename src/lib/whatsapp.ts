// WhatsApp "click to chat" (wa.me). Enquanto não há push, a equipe envia a mensagem pelo próprio
// WhatsApp (nada é enviado automaticamente pelo sistema).
import type { Guardian } from "./domain/types";

/** Normaliza telefone brasileiro para o formato internacional (55 + DDD + número). Retorna null se inválido. */
export function normalizePhoneBR(raw: string): string | null {
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return null;
}

export function whatsappLink(phone: string, text: string): string | null {
  const n = normalizePhoneBR(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Responsáveis antigos (sem o campo) usam a preferência de contato como indício. */
export function hasWhatsapp(
  g: Pick<Guardian, "whatsapp" | "contactPref">,
): boolean {
  return g.whatsapp ?? g.contactPref === "whatsapp";
}

/** Mensagem genérica: nunca inclui motivo, saúde ou outros dados sensíveis. */
export function callMessage(opts: {
  guardian: string;
  child: string;
  className?: string;
  church: string;
}) {
  const sala = opts.className ? ` (${opts.className})` : "";
  return `Olá, ${opts.guardian.split(" ")[0]}! Aqui é do Ministério Infantil da ${opts.church}. Pedimos que você venha até a sala do(a) ${opts.child}${sala} assim que possível. Obrigado!`;
}
