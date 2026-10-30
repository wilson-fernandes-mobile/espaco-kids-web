import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "@/lib/domain/labels";
import type { Child } from "@/lib/domain/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const toneCls: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};
export function StatusPill({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: Tone;
}) {
  const t = tone ?? TONE[value] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneCls[t],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            toneCls[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-surface", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  text,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  text?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      {text && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Restricted() {
  return (
    <div className="card-surface">
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        text="Seu perfil não tem permissão para esta área. Fale com a coordenação ou administração."
      />
    </div>
  );
}

const avatarTones = [
  "bg-primary-soft text-primary",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-accent text-accent-foreground",
];
export function KidAvatar({
  child,
  size = "md",
}: {
  child: Pick<Child, "nickname" | "fullName" | "photoUrl" | "id">;
  size?: "sm" | "md" | "lg";
}) {
  const s = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-20 text-2xl",
  }[size];
  const n =
    child.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    avatarTones.length;
  if (child.photoUrl)
    return (
      <img
        src={child.photoUrl}
        alt={child.fullName}
        className={cn("shrink-0 rounded-full object-cover", s)}
      />
    );
  const initials = child.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        s,
        avatarTones[n],
      )}
    >
      {initials}
    </div>
  );
}
