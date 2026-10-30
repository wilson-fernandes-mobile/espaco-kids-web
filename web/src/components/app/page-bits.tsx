import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Loader2,
  Search,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PageLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function ErrorBanner() {
  const { error } = useStore();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex gap-3 rounded-lg border border-destructive/30 bg-danger-soft p-3 text-sm text-destructive"
    >
      <TriangleAlert className="size-4 shrink-0 translate-y-0.5" /> {error}
    </div>
  );
}

/** Convite para carregar dados de demonstração quando o banco está vazio. */
export function SeedCard({ canSeed }: { canSeed: boolean }) {
  const { seedDemo } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <div className="card-surface mb-6 flex flex-col gap-4 border-primary/30 bg-primary-soft/50 p-5 sm:flex-row sm:items-center">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <DatabaseZap className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">Seu banco de dados está vazio</p>
        <p className="text-sm text-muted-foreground">
          Comece cadastrando turmas e famílias
          {canSeed
            ? ", ou carregue dados fictícios para conhecer o sistema (não use dados reais de crianças na demonstração)."
            : "."}
        </p>
      </div>
      {canSeed && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await seedDemo();
              toast.success("Dados de demonstração carregados.");
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Falha ao carregar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="animate-spin" />} Carregar demonstração
        </Button>
      )}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

export function usePagination<T>(items: T[], size = 10) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => {
    if (page >= pages) setPage(0);
  }, [pages, page]);
  const slice = useMemo(
    () => items.slice(page * size, page * size + size),
    [items, page, size],
  );
  return { slice, page, pages, setPage, total: items.length, size };
}

export function Pager({
  page,
  pages,
  setPage,
  total,
  size,
}: ReturnType<typeof usePagination>) {
  if (total <= size) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {page * size + 1}–{Math.min(total, (page + 1) * size)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular-nums">
          {page + 1}/{pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= pages - 1}
          onClick={() => setPage(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/** Tenta executar uma ação assíncrona exibindo toast de sucesso/erro. */
export async function attempt(fn: () => Promise<unknown>, ok?: string) {
  try {
    await fn();
    if (ok) toast.success(ok);
    return true;
  } catch (e) {
    toast.error(
      e instanceof Error ? e.message : "Não foi possível concluir a operação.",
    );
    return false;
  }
}
