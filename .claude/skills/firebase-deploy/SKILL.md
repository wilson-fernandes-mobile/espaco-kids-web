---
name: firebase-deploy
description: Publica regras e índices do Firestore do Espaço Kids (projeto espacokids-app) usando o Node correto via nvm. Use quando alterar firestore.rules ou firestore.indexes.json, ou quando pedirem para publicar/atualizar o Firebase.
---

# Publicar Firestore (espacokids-app)

1. Troque para Node 22 (o Firebase CLI exige ≥ 20; o padrão da máquina pode ser v10):
   `nvm use 22.14.0` (PowerShell)
2. Revise `firestore.rules` — nunca afrouxe regras de `health`, `audit` ou `users` sem pedido explícito do usuário.
3. Rode `bun run build` para garantir que o app compila.
4. Publique: `firebase deploy --only firestore --project espacokids-app`
5. Confirme "released rules" na saída e informe o usuário.

Não leia nem copie credenciais do CLI (`~/.config/configstore`). Habilitar Authentication é passo manual no console (ver `docs/FIREBASE.md`).
