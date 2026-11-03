import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import successData from "@/assets/lottie/success.json";

/**
 * Animação Lottie de sucesso (círculo + check desenhado). Carrega o player sob
 * demanda e, com "reduzir movimento" ativo, mostra direto o quadro final.
 */
export function SuccessAnimation({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: { destroy: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("lottie-web/build/player/lottie_light");
        if (cancelled || !ref.current) return;
        const lottie = mod.default;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const a = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop: false,
          autoplay: !reduce,
          animationData: successData,
        });
        if (reduce) a.goToAndStop(a.totalFrames - 1, true);
        anim = a;
      } catch {
        // sem animação: o título já comunica o sucesso
      }
    })();
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Concluído"
      className={cn("mx-auto size-28", className)}
    />
  );
}
