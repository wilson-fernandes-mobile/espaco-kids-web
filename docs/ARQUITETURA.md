# Arquitetura — Espaço Kids (web)

Sistema de gestão do ministério infantil. Front-end web em **TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn/ui**, com **Firebase** (Auth + Firestore) como backend. O app mobile (Flutter, futuro) usará o mesmo projeto Firebase.

## Camadas

```
src/
├─ routes/                 Telas (file-based routing). Só apresentação + orquestração.
├─ components/app/         Componentes do sistema (shell, login, badge, scanner, bits de página)
├─ components/ui/          shadcn/ui (não editar sem necessidade)
└─ lib/
   ├─ firebase/client.ts   Inicialização do Firebase (somente navegador, lê VITE_FIREBASE_*)
   ├─ auth.tsx             AuthProvider: login, perfil/papel (users/{uid}), bootstrap do 1º admin
   ├─ store.tsx            StoreProvider: assinaturas em tempo real + ações (único acesso a dados)
   └─ domain/              Regras puras, sem UI e sem Firebase
      ├─ types.ts          Contratos de dados (espelham os documentos do Firestore)
      ├─ rules.ts          Permissões, validação de check-in/out, ocupação, token opaco
      ├─ labels.ts         Rótulos pt-BR e formatadores
      └─ mock.ts           Dados fictícios de demonstração + configurações padrão
```

Regra de ouro: **componentes não falam com o Firestore**; usam `useStore()`. Regras de negócio ficam em `domain/rules.ts`.

## Fluxo de autenticação

`AuthProvider` → `Gate` (em `routes/__root.tsx`):

| status | tela |
|---|---|
| `loading` | Splash |
| `signed-out` | Login (entrar / recuperar senha / primeiro acesso) |
| `no-profile` / `inactive` | Tela de acesso bloqueado |
| `ready` | `StoreProvider` + `AppShell` + rota |

O `StoreProvider` só monta (e só assina o Firestore) depois do login, e assina apenas o que o papel permite (menor privilégio).

**Cadastro (/registrar)**, com duas abas, no padrão do MovaChurch/ClinicaMedica:
- **Cadastrar igreja:** cria a conta do primeiro administrador. Em um *batch*, grava `users/{uid}` (role `admin`) + `meta/bootstrap` e o nome da igreja em `settings/church`. As regras só permitem isso enquanto `meta/bootstrap` não existir.
- **Entrar com código:** professor/recepção criam a própria conta com o código de convite do admin (Usuários e permissões → Código de convite). Não há aprovação. As Security Rules validam que o código existe e está ativo, que o papel é só `professor` ou `recepcao` (nunca admin/coordenação), que a conta nasce sem turmas e que o e-mail é o do próprio login. "Gerar novo" invalida o código anterior na hora. O admin atribui as turmas do professor depois, na lista de usuários.
- O admin também pode criar usuários diretamente (usa um app Firebase secundário para não derrubar a própria sessão).

## Modelo de dados (Firestore)

| Coleção | Conteúdo | Escrita |
|---|---|---|
| `users/{uid}` | nome, e-mail, `role`, `classIds`, `active` | admin; autocadastro só com código de convite (professor/recepção) |
| `invites/{CÓDIGO}` | código de convite da equipe (`KIDS-XXXXXX`), gerado/regenerado pelo admin | admin |
| `familyLinks/{LK-XXXXXX}` | código de vínculo da família para criar conta no app (gerado em Famílias → Acesso ao aplicativo) | admin/coord/recepção |
| `checkinRequests` | pedidos "estou chegando"/"vou buscar" feitos no app da família | família cria; equipe confirma |
| `settings/church` | nome, unidades, crachá, regras, notificações, privacidade | admin |
| `children`, `families`, `guardians`, `authorized` | cadastros | admin/coord/recepção |
| `health/{childId}` | **saúde** (separada de propósito) | admin/coord (leitura também) |
| `classes` | turmas | admin/coord |
| `badges` | crachás; `token` opaco aleatório (QR = `EK:<token>`) | admin/coord/recepção |
| `attendance` | histórico de entradas/saídas | admin/coord/recepção |
| `presence/{childId}` | marcador de "presente agora" | admin/coord/recepção |
| `calls` | chamadas aos responsáveis (+ `history`) | qualquer usuário ativo |
| `notifications` | central de eventos (entrega real = futuro) | qualquer usuário ativo |
| `audit` | auditoria imutável (create-only) | qualquer usuário ativo (leitura: admin/coord) |
| `meta/counters`, `meta/bootstrap` | contadores de código e trava do 1º admin | — |

### Decisões importantes
- **Sem entrada duplicada:** `presence/{childId}` + transação (`runTransaction`). Dois tablets não conseguem dar entrada na mesma criança.
- **Saída:** valida pessoa autorizada/vigente (`validateCheckOut`) e encerra `presence` na mesma transação. Tentativas bloqueadas geram auditoria + alerta.
- **QR Code:** só token aleatório de 96 bits (`opaqueToken`). Ler o QR apenas *localiza* o cadastro; nunca libera retirada.
- **Saúde isolada** em `health/` com regra própria — professores/recepção não conseguem ler nem pela API.
- **Fotos:** reduzidas no navegador (~320 px) e gravadas como data URL no documento (evita Cloud Storage, que exige plano Blaze). Para mais volume, migrar para Storage.
- **Ids/códigos:** `CR-1001…` e `FAM-201…` via contador transacional em `meta/counters`.
- **Janela de dados:** presenças dos últimos 400 dias, 500 chamadas, 300 notificações/auditorias carregadas em tempo real.

## Segurança (LGPD)
- Autorização real nas **Security Rules** (`firestore.rules`); a UI só espelha as permissões.
- Auditoria imutável; notificações sem dados sensíveis; sem dados pessoais no QR.
- Ainda **não** implementado (ver "Próximos passos"): registro formal de consentimento por criança, expiração automática de crachá no servidor, retenção/anonimização.

## App mobile
Veja [MOBILE.md](MOBILE.md): app Flutter (professores, recepção e famílias) no mesmo Firebase. Contas com papel `responsavel` não acessam o painel web.

## Próximos passos
1. **Cloud Functions** (plano Blaze): validar retirada no servidor, push (FCM), expirar crachás, rotinas de retenção LGPD.
2. **App Flutter** dos responsáveis: login por telefone/e-mail, push de chamadas, status da criança.
3. Papel `responsavel` com custom claims e regras por família.
4. Cloud Storage para fotos, App Check, backup agendado do Firestore.
5. Hospedagem (Firebase Hosting ou Cloudflare via Nitro — o projeto já gera build para Cloudflare).
