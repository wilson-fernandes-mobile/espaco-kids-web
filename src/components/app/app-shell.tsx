import { Link, useRouterState } from "@tanstack/react-router";
import { AppLogo } from "@/components/app/app-logo";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Baby,
  Users,
  ScanLine,
  School,
  QrCode,
  BellRing,
  Bell,
  BarChart3,
  ShieldCheck,
  Settings,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Church,
  LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { can, ROLE_LABEL, type Permission } from "@/lib/domain/rules";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { aplicarTema } from "@/lib/tema";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Baby;
  perm: Permission;
};

// Menu em grupos: o que se usa no dia do culto, os cadastros, a gestão e,
// fixo no rodapé, a administração da igreja.
const NAV_GROUPS: { title?: string; footer?: boolean; items: NavItem[] }[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
    ],
  },
  {
    title: "Dia a dia",
    items: [
      {
        to: "/checkin",
        label: "Check-in e check-out",
        icon: ScanLine,
        perm: "checkin",
      },
      {
        to: "/chamadas",
        label: "Chamadas aos responsáveis",
        icon: BellRing,
        perm: "chamadas",
      },
      {
        to: "/notificacoes",
        label: "Notificações",
        icon: Bell,
        perm: "notificacoes",
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { to: "/criancas", label: "Crianças", icon: Baby, perm: "criancas" },
      {
        to: "/familias",
        label: "Famílias e responsáveis",
        icon: Users,
        perm: "familias",
      },
      { to: "/turmas", label: "Turmas e salas", icon: School, perm: "turmas" },
      {
        to: "/crachas",
        label: "Crachás e QR Codes",
        icon: QrCode,
        perm: "crachas",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        to: "/relatorios",
        label: "Relatórios",
        icon: BarChart3,
        perm: "relatorios",
      },
    ],
  },
  {
    title: "Administração",
    footer: true,
    items: [
      {
        to: "/usuarios",
        label: "Usuários e permissões",
        icon: ShieldCheck,
        perm: "usuarios",
      },
      {
        to: "/configuracoes",
        label: "Configurações da igreja",
        icon: Settings,
        perm: "configuracoes",
      },
    ],
  },
];

function SideNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { role, state } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pendingCalls = state.calls.filter(
    (c) => !["atendida", "cancelada"].includes(c.status),
  ).length;
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-3 py-5",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        {/* Logo da igreja (Configurações) no lugar do ícone, no mesmo formato. */}
        {state.settings.logoUrl ? (
          <img
            src={state.settings.logoUrl}
            alt={`Logo ${state.settings.name}`}
            className="size-10 shrink-0 rounded-xl bg-card object-cover"
          />
        ) : (
          <AppLogo className="size-10" />
        )}
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <p className="truncate text-sm font-bold">Espaço Kids</p>
          <p className="truncate text-xs text-muted-foreground">
            {state.settings.name}
          </p>
        </div>
      </div>
      {(() => {
        const renderItem = (n: NavItem) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const link = (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              aria-label={collapsed ? n.label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <n.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{n.label}</span>}
              {n.perm === "chamadas" && pendingCalls > 0 && (
                <span
                  className={cn(
                    "rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground",
                    collapsed ? "absolute right-1 top-0.5 px-1" : "ml-auto",
                  )}
                >
                  {pendingCalls}
                </span>
              )}
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip key={n.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{n.label}</TooltipContent>
            </Tooltip>
          );
        };
        const renderGroup = (g: (typeof NAV_GROUPS)[number], i: number) => {
          const items = g.items.filter((n) => can(role, n.perm));
          if (items.length === 0) return null;
          return (
            <div key={g.title ?? `g${i}`} className={cn(i > 0 && "mt-4")}>
              {g.title &&
                (collapsed ? (
                  <div className="mx-3 mb-2 border-t" aria-hidden="true" />
                ) : (
                  <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.title}
                  </p>
                ))}
              <div className="space-y-0.5">{items.map(renderItem)}</div>
            </div>
          );
        };
        const main = NAV_GROUPS.filter((g) => !g.footer);
        const foot = NAV_GROUPS.filter((g) => g.footer)
          .map((g) => renderGroup(g, 0))
          .filter(Boolean);
        return (
          <>
            <nav
              className={cn(
                "flex-1 overflow-y-auto pb-4",
                collapsed ? "px-2" : "px-3",
              )}
            >
              {main.map(renderGroup)}
            </nav>
            {foot.length > 0 && (
              <div className={cn("border-t py-3", collapsed ? "px-2" : "px-3")}>
                {foot}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("ek-sidebar") === "1");
    } catch {
      /* sem acesso ao storage */
    }
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("ek-sidebar", c ? "0" : "1");
      } catch {
        /* ignora */
      }
      return !c;
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const { role, currentUser, state } = useStore();
  const { signOut, openChurchPicker, churchName, memberships } = useAuth();
  // Cor da igreja (Configurações): aplica ao entrar e volta ao padrão ao sair.
  useEffect(() => {
    aplicarTema(state.settings.themeColor);
    return () => aplicarTema(undefined);
  }, [state.settings.themeColor]);
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen">
        <aside
          className={cn(
            "no-print fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:block",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <SideNav collapsed={collapsed} />
        </aside>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SideNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div
          className={cn(
            "transition-[padding] duration-200 print:pl-0",
            collapsed ? "lg:pl-16" : "lg:pl-64",
          )}
        >
          <header className="no-print sticky top-0 z-20 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Abrir menu"
                className="rounded-lg p-2 hover:bg-muted lg:hidden"
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </button>
              <button
                aria-label={
                  collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
                }
                title={
                  collapsed
                    ? "Expandir menu (Ctrl+B)"
                    : "Recolher menu (Ctrl+B)"
                }
                className="hidden rounded-lg p-2 hover:bg-muted lg:block"
                onClick={toggleSidebar}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-5" />
                ) : (
                  <PanelLeftClose className="size-5" />
                )}
              </button>
              <p className="hidden truncate font-semibold md:block">
                {state.settings.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/notificacoes"
                aria-label="Notificações"
                className="relative rounded-lg p-2 hover:bg-muted"
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-muted">
                  <div className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {currentUser
                      .split(" ")
                      .slice(-2)
                      .map((p) => p[0])
                      .join("")}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold leading-tight">
                      {currentUser}
                    </p>
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      {ROLE_LABEL[role]}
                    </p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold">{currentUser}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[role]}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openChurchPicker}>
                    <Church className="size-4" />
                    <span className="min-w-0">
                      <span className="block truncate">Trocar de igreja</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {churchName}
                        {memberships.length > 1 ? ` · ${memberships.length} igrejas` : ""}
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="size-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
