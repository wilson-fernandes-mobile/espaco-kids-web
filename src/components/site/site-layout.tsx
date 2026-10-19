import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppLogo } from "@/components/app/app-logo";
import { SITE } from "@/lib/site";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/planos", label: "Planos" },
  { to: "/ajuda", label: "Ajuda" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <AppLogo className="size-9" />
          <span className="font-bold">{SITE.name}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/entrar"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            Entrar
          </Link>
          <Link
            to="/registrar"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Criar conta
          </Link>
        </div>
        <button
          className="rounded-lg p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div
          className="space-y-1 border-t px-4 py-3 md:hidden"
          onClick={() => setOpen(false)}
        >
          {[
            ...NAV,
            { to: "/entrar", label: "Entrar" },
            { to: "/registrar", label: "Criar conta" },
          ].map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

const FOOTER_LEGAL = [
  { to: "/privacidade", label: "Política de Privacidade" },
  { to: "/termos-de-uso", label: "Termos de Uso" },
  { to: "/lgpd", label: "LGPD" },
  { to: "/exclusao-de-conta", label: "Exclusão de conta" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <AppLogo className="size-9" />
            <span className="font-bold">{SITE.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Gestão do ministério infantil: check-in seguro, chamadas aos pais e
            cuidado com cada criança.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Produto</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/planos" className="hover:text-foreground">
                Planos e preços
              </Link>
            </li>
            <li>
              <Link to="/ajuda" className="hover:text-foreground">
                Central de ajuda
              </Link>
            </li>
            <li>
              <Link to="/contato" className="hover:text-foreground">
                Contato
              </Link>
            </li>
            <li>
              <Link to="/entrar" className="hover:text-foreground">
                Entrar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {FOOTER_LEGAL.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <section className="bg-primary-soft/60 py-14">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {eyebrow}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
      </div>
    </section>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t py-7 first:border-t-0">
      <h2 className="flex items-baseline gap-3 text-lg font-bold">
        <span className="tabular-nums text-primary">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** Marca o que precisa ser preenchido com dado real antes de publicar. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-dashed border-amber-500/60 bg-amber-100 px-1.5 py-0.5 text-amber-900">
      {children}
    </span>
  );
}

export function LegalPage({
  eyebrow = "Legal",
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <SitePage>
      <PageHero eyebrow={eyebrow} title={title} subtitle={intro} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</div>
    </SitePage>
  );
}

export function CtaBand({
  title,
  subtitle,
  to,
  label,
}: {
  title: string;
  subtitle?: string;
  to: string;
  label: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
      <div className="rounded-3xl bg-primary p-8 text-center text-primary-foreground">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle && (
          <p className="mx-auto mt-2 max-w-lg text-sm opacity-90">{subtitle}</p>
        )}
        <Link
          to={to}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary"
        >
          {label} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
