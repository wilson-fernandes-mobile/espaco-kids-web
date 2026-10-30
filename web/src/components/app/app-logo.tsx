import { cn } from "@/lib/utils";

/** Logo do Espaço Kids (arquivo completo, só arredondado). */
export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Espaço Kids"
      className={cn("shrink-0 rounded-xl object-cover", className)}
    />
  );
}
