# Espaço Kids — Gestão do Ministério Infantil

Sistema web para cadastro de crianças e famílias, turmas, check-in/check-out, crachás com QR Code, chamadas aos responsáveis, notificações, relatórios, usuários e configurações. Backend: **Firebase (Auth + Firestore)**.

## Rodar
```sh
nvm use 22.14.0     # Windows/nvm-windows
bun install         # ou npm i
bun run dev         # http://localhost:5173
```
Antes do primeiro login: habilite **E-mail/senha** em Firebase → Authentication (ver `docs/FIREBASE.md`). Depois, na tela de login, **Criar administrador**.

## Documentação
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — camadas, modelo de dados, segurança, próximos passos
- [`docs/FIREBASE.md`](docs/FIREBASE.md) — projeto, variáveis, deploy das regras
- [`docs/IMPRESSORA.md`](docs/IMPRESSORA.md) — recomendação de impressora de crachás
- Skills do projeto em `.claude/skills/` (`firebase-deploy`, `novo-modulo`, `verificar-projeto`)

## Stack
TanStack Start · React 19 · TypeScript · Tailwind v4 · shadcn/ui · react-hook-form + zod · Recharts · qrcode.react + jsQR · Firebase.

Projeto sincronizado com Lovable: evite reescrever histórico git publicado.

## App mobile
Mapeamento do app Flutter (professores, recepção e famílias): [docs/MOBILE.md](docs/MOBILE.md).
