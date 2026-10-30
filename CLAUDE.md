# Espaço Kids

Contexto completo (web + mobile, banco de dados, publicação, pendências): **`.claude/CONTEXTO.md`**. Leia primeiro.

Resumo rápido:
- Web: este repo (TanStack Start + React + Firebase). Mobile Flutter: pasta `mobile/` (monorepo; antes era o repo `espaco-kids-app`, histórico importado; skills `nova-versao` e `android-sha-fingerprints` em `.claude/skills/`). Backend único: Firebase `espacokids-app` (Firestore multi-igreja em `tenants/{churchId}/...`, Auth, Functions, Hosting).
- Componentes não acessam o Firestore: usam `useStore()`; regras de negócio em `src/lib/domain/rules.ts`; autorização real em `firestore.rules`.
- Verificação: `vite build` (não há tsconfig na raiz) e `vitest run`.
- **Para gerar versão do app Android é preciso pedir as chaves de assinatura no cofre; elas não vão para o git** (detalhes no CONTEXTO.md, seção 7).
