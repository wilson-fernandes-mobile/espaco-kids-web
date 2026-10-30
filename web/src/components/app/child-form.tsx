import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Lock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { resizePhoto } from "@/lib/photo";
import { KidAvatar } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import type { Child } from "@/lib/domain/types";

const schema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo").max(120),
  nickname: z
    .string()
    .trim()
    .min(1, "Informe como a criança é chamada")
    .max(40),
  birthDate: z
    .string()
    .min(1, "Informe a data de nascimento")
    .refine((d) => new Date(d) <= new Date(), "Data no futuro"),
  photoUrl: z.string().optional(),
  classId: z.string().min(1, "Selecione a turma"),
  familyId: z.string().min(1, "Selecione a família"),
  notes: z.string().max(500),
  health: z.string().max(500),
  status: z.enum(["ativo", "inativo", "pendente"]),
});
type FormValues = z.infer<typeof schema>;

const sel = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

export function ChildForm({
  initial,
  onSaved,
}: {
  initial?: Child;
  onSaved: (c: Child) => void;
}) {
  const { state, saveChild, role } = useStore();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, photoUrl: initial.photoUrl ?? "" }
      : {
          fullName: "",
          nickname: "",
          birthDate: "",
          photoUrl: "",
          classId: "",
          familyId: "",
          notes: "",
          health: "",
          status: "ativo",
        },
  });

  const photo = watch("photoUrl");
  const onPhoto = async (f?: File) => {
    if (!f) return;
    try {
      setValue("photoUrl", await resizePhoto(f), { shouldDirty: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto inválida");
    }
  };

  const submit = async (v: FormValues) => {
    const guardianIds = state.guardians
      .filter((g) => g.familyId === v.familyId)
      .map((g) => g.id);
    const keepAuth = initial && initial.familyId === v.familyId;
    setSaving(true);
    try {
      const c = await saveChild({
        ...v,
        id: initial?.id,
        photoUrl: v.photoUrl || undefined,
        guardianIds: keepAuth ? initial!.guardianIds : guardianIds,
        // Os responsáveis da família já podem retirar a criança; pessoas autorizadas de fora precisam de autorização explícita.
        authorizedIds: keepAuth ? initial!.authorizedIds : guardianIds,
      });
      onSaved(c);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Verifique sua permissão e conexão.",
      );
    } finally {
      setSaving(false);
    }
  };

  const F = ({
    name,
    label,
    children,
  }: {
    name: keyof FormValues;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {errors[name] && (
        <p className="text-xs text-destructive">{errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <F name="fullName" label="Nome completo *">
          <Input id="fullName" {...register("fullName")} />
        </F>
        <F name="nickname" label="Como é conhecida *">
          <Input id="nickname" {...register("nickname")} />
        </F>
        <F name="birthDate" label="Data de nascimento *">
          <Input id="birthDate" type="date" {...register("birthDate")} />
        </F>
        <div className="space-y-1.5">
          <Label>Foto (opcional)</Label>
          <div className="flex items-center gap-3">
            <KidAvatar
              child={{
                id: "x",
                nickname: "",
                fullName: watch("fullName") || "?",
                photoUrl: photo || undefined,
              }}
              size="md"
            />
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Camera className="size-4" /> {photo ? "Trocar" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover foto"
                onClick={() => setValue("photoUrl", "", { shouldDirty: true })}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
        <F name="classId" label="Turma *">
          <select id="classId" className={sel} {...register("classId")}>
            <option value="">Selecione…</option>
            {state.classes
              .filter((c) => c.active || c.id === initial?.classId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.ageMin}–{c.ageMax} anos)
                </option>
              ))}
          </select>
        </F>
        <F name="familyId" label="Família / responsáveis *">
          <select id="familyId" className={sel} {...register("familyId")}>
            <option value="">Selecione…</option>
            {state.families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.code}
              </option>
            ))}
          </select>
        </F>
        <F name="status" label="Situação do cadastro">
          <select id="status" className={sel} {...register("status")}>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="inativo">Inativo</option>
          </select>
        </F>
        <div className="space-y-1.5">
          <Label>Código interno</Label>
          <Input disabled value={initial?.code ?? "Gerado ao salvar"} />
        </div>
      </div>
      <F name="notes" label="Observações para o cuidado">
        <Textarea id="notes" rows={3} {...register("notes")} />
      </F>
      {can(role, "saude") ? (
        <F name="health" label="Alergias e saúde (acesso restrito)">
          <Textarea
            id="health"
            rows={2}
            placeholder="Somente o estritamente necessário"
            {...register("health")}
          />
        </F>
      ) : (
        <p className="flex items-center gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Informações de saúde visíveis apenas
          para coordenação e administração.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving || isSubmitting}>
          {saving && <Loader2 className="animate-spin" />}
          {initial ? "Salvar alterações" : "Cadastrar criança"}
        </Button>
      </div>
    </form>
  );
}
