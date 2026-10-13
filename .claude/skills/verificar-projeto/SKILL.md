---
name: verificar-projeto
description: Roda build, testes e checagem de tipos do Espaço Kids. Use antes de concluir qualquer alteração de código.
---

# Verificar projeto

Com Node 22 ativo (`nvm use 22.14.0`), na raiz:

1. `bun run build` — deve terminar sem erro.
2. `bun run test` — Vitest.
3. Tipos: o `src/tsconfig.json` do template está fora do lugar; use um tsconfig temporário na raiz com `strict`, `baseUrl: "."`, `paths: {"@/*": ["./src/*"]}` e `include: ["src/**/*"]`, rode `npx tsc --noEmit -p <arquivo>` e apague-o depois.
4. `npx prettier --write` nos arquivos alterados (fora de `components/ui`).

Relate falhas com a saída real; não declare concluído se algo falhou.
