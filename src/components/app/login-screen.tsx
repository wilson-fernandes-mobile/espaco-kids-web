import { useState, type ReactNode } from "react";
import { AppLogo } from "@/components/app/app-logo";
import { Link } from "@tanstack/react-router";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  Eye,
  KeyRound,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Phone,
  QrCode,
  Send,
  ShieldCheck,
  TriangleAlert,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authErrorMessage, useAuth } from "@/lib/auth";

const emailField = z
  .string()
  .trim()
  .min(1, "Informe o e-mail")
  .email("E-mail inválido");
const passField = z.string().min(6, "Mínimo de 6 caracteres");
const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Informe a senha"),
});
const resetSchema = z.object({ email: emailField });
const churchSchema = z
  .object({
    churchName: z.string().trim().min(3, "Informe o nome da igreja"),
    name: z.string().trim().min(3, "Informe seu nome completo"),
    email: emailField,
    password: passField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });
const accessSchema = z
  .object({
    code: z.string().trim().min(6, "Informe o código de convite"),
    role: z.enum(["professor", "recepcao"]),
    name: z.string().trim().min(3, "Informe seu nome completo"),
    email: emailField,
    password: passField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });

export function Splash({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <AppLogo className="size-12 rounded-2xl" />
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {label}
        </p>
      </div>
    </div>
  );
}

/** Tela exibida a quem está autenticado mas sem acesso liberado. */
export function BlockedScreen({ kind }: { kind: "no-profile" | "inactive" }) {
  const { signOut, user } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-surface max-w-md p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {kind === "inactive" ? "Acesso desativado" : "Acesso não liberado"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {kind === "inactive"
            ? "Seu usuário foi desativado. Fale com a coordenação ou administração do ministério."
            : `A conta ${user?.email ?? ""} não possui perfil de acesso. Peça ao administrador um código de convite ou que cadastre você em “Usuários e permissões”. Contas de família usam o aplicativo Espaço Kids.`}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {kind === "no-profile" && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Atualizar
            </Button>
          )}
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Layout compartilhado: painel institucional + área do formulário. */
function AuthLayout({
  children,
  back,
}: {
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.15_255)] p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-success/30" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="size-11" />
            <span className="text-lg font-bold">Espaço Kids</span>
          </div>
          {back && (
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Voltar ao login
            </Link>
          )}
        </div>
        <div className="relative max-w-md space-y-8">
          <h2 className="text-4xl font-extrabold leading-tight">
            Cuidado e segurança para cada criança do seu ministério.
          </h2>
          <ul className="space-y-3 text-sm">
            {(
              [
                [QrCode, "Check-in e check-out rápidos com crachá e QR Code"],
                [ShieldCheck, "Retirada somente por pessoas autorizadas"],
                [Users, "Chamadas aos responsáveis em segundos"],
              ] as const
            ).map(([I, text]) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur"
              >
                <I className="size-4 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          Dados de crianças tratados conforme a LGPD.
        </p>
      </aside>
      <main className="flex items-center justify-center overflow-y-auto bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <AppLogo className="size-10" />
              <span className="font-bold">Espaço Kids</span>
            </div>
            {back && (
              <Link
                to="/"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Voltar ao login
              </Link>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Campo com ícone à esquerda e (opcional) botão de mostrar senha. */
function IconField<T extends FieldValues>({
  id,
  label,
  icon: Icon,
  error,
  register,
  name,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  toggle,
  right,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  error?: string;
  register: UseFormRegister<T>;
  name: Path<T>;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  toggle?: { show: boolean; set: (v: boolean) => void };
  right?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {right}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={toggle ? (toggle.show ? "text" : "password") : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className="h-11 pl-9 pr-11"
          {...register(name)}
        />
        {toggle && (
          <button
            type="button"
            onClick={() => toggle.set(!toggle.show)}
            aria-label={toggle.show ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
          >
            {toggle.show ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const FormError = ({ msg }: { msg: string | null }) =>
  msg ? (
    <p
      role="alert"
      className="rounded-md bg-danger-soft p-3 text-sm text-destructive"
    >
      {msg}
    </p>
  ) : null;
const SubmitBtn = ({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) => (
  <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
    {busy && <Loader2 className="animate-spin" />}
    {children}
  </Button>
);

export function LoginScreen() {
  const { signIn, resetPassword, configured } = useAuth();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const login = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const reset = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });
  const go = (m: typeof mode) => {
    setMode(m);
    setFormError(null);
    setSent(false);
  };
  const run = async (fn: () => Promise<void>) => {
    setFormError(null);
    try {
      await fn();
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  return (
    <AuthLayout>
      {!configured && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs">
          Firebase não configurado. Copie <code>.env.example</code> para{" "}
          <code>.env</code> e reinicie o servidor.
        </div>
      )}

      {mode === "login" ? (
        <form
          onSubmit={login.handleSubmit((v) =>
            run(() => signIn(v.email, v.password)),
          )}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Entrar na sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse o painel do ministério infantil.
            </p>
          </div>
          <IconField
            id="email"
            label="E-mail"
            icon={Mail}
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="voce@igreja.org"
            register={login.register}
            name="email"
            error={login.formState.errors.email?.message}
          />
          <IconField
            id="password"
            label="Senha"
            icon={Lock}
            autoComplete="current-password"
            placeholder="••••••••"
            toggle={{ show, set: setShow }}
            register={login.register}
            name="password"
            error={login.formState.errors.password?.message}
            right={
              <button
                type="button"
                onClick={() => go("reset")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            }
          />
          <FormError msg={formError} />
          <SubmitBtn busy={login.formState.isSubmitting}>Entrar</SubmitBtn>
          <div className="relative py-1 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-background px-3">
              ainda não tem acesso?
            </span>
            <div className="absolute inset-x-0 top-1/2 border-t" />
          </div>
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <Link to="/registrar">
              <UserPlus /> Criar cadastro
            </Link>
          </Button>
        </form>
      ) : (
        <form
          onSubmit={reset.handleSubmit((v) =>
            run(async () => {
              await resetPassword(v.email);
              setSent(true);
            }),
          )}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Recuperar senha
            </h1>
            <p className="text-sm text-muted-foreground">
              Enviaremos um link para você criar uma nova senha.
            </p>
          </div>
          {sent ? (
            <div className="flex gap-3 rounded-lg bg-success-soft p-4 text-sm text-success">
              <MailCheck className="size-5 shrink-0" />
              Se o e-mail estiver cadastrado, o link chegará em instantes.
              Confira também o spam.
            </div>
          ) : (
            <>
              <IconField
                id="remail"
                label="E-mail"
                icon={Mail}
                type="email"
                autoFocus
                register={reset.register}
                name="email"
                error={reset.formState.errors.email?.message}
              />
              <FormError msg={formError} />
              <SubmitBtn busy={reset.formState.isSubmitting}>
                Enviar link
              </SubmitBtn>
            </>
          )}
          <button
            type="button"
            onClick={() => go("login")}
            className="w-full text-center text-sm font-semibold text-primary hover:underline"
          >
            Voltar ao login
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function ChurchForm() {
  const { bootstrapAdmin } = useAuth();
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = useForm<z.infer<typeof churchSchema>>({
    resolver: zodResolver(churchSchema),
    defaultValues: {
      churchName: "",
      name: "",
      email: "",
      password: "",
      confirm: "",
    },
  });
  const e = f.formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={f.handleSubmit(async (v) => {
        setErr(null);
        try {
          await bootstrapAdmin(v.churchName, v.name, v.email, v.password);
          toast.success("Igreja cadastrada. Bem-vindo!");
        } catch (x) {
          setErr(authErrorMessage(x));
        }
      })}
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          Cadastre sua igreja
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você será o administrador e cadastrará o restante da equipe depois. Só
          é possível enquanto o sistema não tiver administrador.
        </p>
      </div>
      <IconField
        id="c-church"
        label="Nome da igreja"
        icon={Building2}
        placeholder="Igreja Comunidade Luz"
        register={f.register}
        name="churchName"
        error={e.churchName?.message}
      />
      <hr />
      <IconField
        id="c-name"
        label="Seu nome (administrador)"
        icon={User}
        autoComplete="name"
        register={f.register}
        name="name"
        error={e.name?.message}
      />
      <IconField
        id="c-email"
        label="Seu e-mail de acesso"
        icon={Mail}
        type="email"
        autoComplete="email"
        register={f.register}
        name="email"
        error={e.email?.message}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <IconField
          id="c-pass"
          label="Senha"
          icon={Lock}
          autoComplete="new-password"
          toggle={{ show, set: setShow }}
          register={f.register}
          name="password"
          error={e.password?.message}
        />
        <IconField
          id="c-conf"
          label="Confirmar senha"
          icon={Lock}
          autoComplete="new-password"
          toggle={{ show, set: setShow }}
          register={f.register}
          name="confirm"
          error={e.confirm?.message}
        />
      </div>
      <FormError msg={err} />
      <SubmitBtn busy={f.formState.isSubmitting}>Cadastrar igreja</SubmitBtn>
    </form>
  );
}

function AccessForm() {
  const { joinWithCode } = useAuth();
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = useForm<z.infer<typeof accessSchema>>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      code: "",
      role: "professor",
      name: "",
      email: "",
      password: "",
      confirm: "",
    },
  });
  const e = f.formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={f.handleSubmit(async (v) => {
        setErr(null);
        try {
          await joinWithCode(v);
          toast.success("Cadastro concluído. Bem-vindo!");
        } catch (x) {
          setErr(authErrorMessage(x));
        }
      })}
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          Entrar com código
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Para professores e recepção. Use o código de convite que o
          administrador compartilhou com você.
        </p>
      </div>
      <IconField
        id="a-code"
        label="Código de convite"
        icon={KeyRound}
        placeholder="KIDS-XXXXXX"
        autoFocus
        register={f.register}
        name="code"
        error={e.code?.message}
      />
      <div className="space-y-1.5">
        <Label htmlFor="a-role">Sua função</Label>
        <select
          id="a-role"
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
          {...f.register("role")}
        >
          <option value="professor">Professor(a) / auxiliar</option>
          <option value="recepcao">Recepção</option>
        </select>
      </div>
      <IconField
        id="a-name"
        label="Nome completo"
        icon={User}
        autoComplete="name"
        register={f.register}
        name="name"
        error={e.name?.message}
      />
      <IconField
        id="a-email"
        label="E-mail"
        icon={Mail}
        type="email"
        autoComplete="email"
        register={f.register}
        name="email"
        error={e.email?.message}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <IconField
          id="a-pass"
          label="Senha"
          icon={Lock}
          autoComplete="new-password"
          toggle={{ show, set: setShow }}
          register={f.register}
          name="password"
          error={e.password?.message}
        />
        <IconField
          id="a-conf"
          label="Confirmar senha"
          icon={Lock}
          autoComplete="new-password"
          toggle={{ show, set: setShow }}
          register={f.register}
          name="confirm"
          error={e.confirm?.message}
        />
      </div>
      <FormError msg={err} />
      <SubmitBtn busy={f.formState.isSubmitting}>
        <Send /> Criar minha conta
      </SubmitBtn>
    </form>
  );
}

export function RegisterScreen() {
  return (
    <AuthLayout back>
      <Tabs defaultValue="acesso">
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="acesso" className="gap-1.5">
            <KeyRound className="size-3.5" /> Entrar com código
          </TabsTrigger>
          <TabsTrigger value="igreja" className="gap-1.5">
            <Building2 className="size-3.5" /> Cadastrar igreja
          </TabsTrigger>
        </TabsList>
        <TabsContent value="acesso" className="mt-6">
          <AccessForm />
        </TabsContent>
        <TabsContent value="igreja" className="mt-6">
          <ChurchForm />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
