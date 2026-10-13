import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasWhatsapp, whatsappLink } from "@/lib/whatsapp";
import type { Guardian } from "@/lib/domain/types";

/** Abre o WhatsApp com a mensagem pronta. Só aparece se a pessoa tem WhatsApp e o telefone é válido. */
export function WhatsAppButton({
  guardian,
  message,
  label = "WhatsApp",
  size = "sm",
  onOpen,
}: {
  guardian: Pick<Guardian, "phone" | "whatsapp" | "contactPref" | "fullName">;
  message: string;
  label?: string;
  size?: "sm" | "icon";
  onOpen?: () => void;
}) {
  if (!hasWhatsapp(guardian)) return null;
  const href = whatsappLink(guardian.phone, message);
  if (!href) return null;
  return (
    <Button
      asChild
      variant="outline"
      size={size}
      className="border-[#25D366]/50 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        aria-label={`Enviar WhatsApp para ${guardian.fullName}`}
      >
        <MessageCircle /> {size === "icon" ? null : label}
      </a>
    </Button>
  );
}
