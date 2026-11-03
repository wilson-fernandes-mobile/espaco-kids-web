import { foldText } from "@/lib/utils";
import type { Child, ClassRoom, Guardian } from "./types";

/**
 * Busca padrão de crianças em todo o sistema: nome, apelido, código, turma e
 * responsáveis. Ignora acentos e maiúsculas. Sem termo, tudo corresponde.
 */
export function makeChildMatcher(
  state: { classes: ClassRoom[]; guardians: Guardian[] },
  query: string,
): (c: Child) => boolean {
  const term = foldText(query.trim());
  if (!term) return () => true;
  const guardiansOf = new Map<string, string>();
  for (const g of state.guardians)
    guardiansOf.set(
      g.familyId,
      `${guardiansOf.get(g.familyId) ?? ""} ${foldText(g.fullName)}`,
    );
  const classNames = new Map(
    state.classes.map((c) => [c.id, foldText(c.name)]),
  );
  return (c) =>
    foldText(c.fullName).includes(term) ||
    foldText(c.nickname).includes(term) ||
    foldText(c.code).includes(term) ||
    (classNames.get(c.classId) ?? "").includes(term) ||
    (guardiansOf.get(c.familyId) ?? "").includes(term);
}

export const CHILD_SEARCH_PLACEHOLDER =
  "Nome, apelido, código, turma ou responsável";
