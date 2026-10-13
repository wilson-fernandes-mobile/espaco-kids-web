---
name: novo-modulo
description: Cria uma nova tela/módulo no Espaço Kids seguindo a arquitetura do projeto (rota, permissão, store, regras do Firestore, menu, documentação). Use ao adicionar páginas, coleções ou funcionalidades.
---

# Novo módulo no Espaço Kids

Leia `docs/ARQUITETURA.md` antes. Checklist:

1. **Tipos** em `src/lib/domain/types.ts` (e regras puras em `domain/rules.ts`, se houver).
2. **Permissão** em `rules.ts` (`Permission` + `PERMISSIONS` por papel).
3. **Dados**: adicione a coleção e as ações em `src/lib/store.tsx` (assinatura em `useEffect`, ação com `log()` de auditoria). Componentes usam só `useStore()`.
4. **Regras do Firestore** em `firestore.rules` (menor privilégio) → skill `firebase-deploy`.
5. **Rota** em `src/routes/<nome>.tsx` (`createFileRoute`), com: `Restricted` se sem permissão, `PageLoading`, `EmptyState`, `ErrorBanner`, formulários `react-hook-form` + `zod`, ações via `attempt()` (toast).
6. **Menu** em `src/components/app/app-shell.tsx` (`NAV`).
7. **Docs**: atualize `docs/ARQUITETURA.md` (modelo de dados).
8. Rode a skill `verificar-projeto`.

Convenções: textos em pt-BR, sem emojis (ícones lucide), sem dados pessoais em QR/notificações, dados fictícios em demonstrações.
