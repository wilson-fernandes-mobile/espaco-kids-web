# Arquitetura — Espaço Kids (web)

Sistema de gestão do ministério infantil, **multi-igreja**. Painel web em **TanStack Start (SPA) + React 19 + TypeScript + Tailwind v4 + shadcn/ui**, com **Firebase** (Auth + Firestore + Cloud Functions + Hosting). O app mobile (Flutter, ver [MOBILE.md](MOBILE.md)) usa o mesmo projeto Firebase (`espacokids-app`).

Visão geral do produto, do banco e da publicação: [`.claude/CONTEXTO.md`](../.claude/CONTEXTO.md).

## Camadas

```
src/
├─ routes/                 Telas (file-based routing). Só apresentação + orquestração.
├─ components/app/         Componentes do sistema (shell, login, seletor de igreja, crachá, scanner, saúde…)
├─ components/site/        Site público (landing, layout)
├─ components/ui/          shadcn/ui (não editar sem necessidade)
└─ lib/
   ├─ firebase/client.ts   Inicialização do Firebase (somente navegador, lê VITE_FIREBASE_*)
   ├─ auth.tsx             AuthProvider: sessão, igrejas da pessoa (memberships), status do Gate
   ├─ store.tsx            StoreProvider: assinaturas em tempo real + ações (único acesso a dados)
   ├─ billing.ts · site.ts Planos/limites/teste grátis e dados do site público
   └─ domain/              Regras puras, sem UI e sem Firebase
      ├─ types.ts          Contratos de dados (espelham os documentos do Firestore)
      ├─ rules.ts          Permissões, validação de check-in/out, ocupação, token opaco
      ├─ care.ts           Formato da ficha de saúde e cuidados
      ├─ labels.ts         Rótulos pt-BR e formatadores
      └─ mock.ts           Dados fictícios de demonstração
```

Regra de ouro: **componentes não falam com o Firestore**; usam `useStore()`. Regras de negócio ficam em `domain/rules.ts`.

## Fluxo de autenticação e Gate

`AuthProvider` → `Gate` (em `routes/__root.tsx`):

| status | tela |
|---|---|
| `loading` | Splash |
| `signed-out` | `/` landing do site · `/entrar` login · `/registrar` cadastro |
| `needs-church` | Seletor de igreja (escolher, criar ou entrar com código) |
| `no-profile` / `inactive` | Tela de acesso bloqueado |
| pronto | `StoreProvider` + `AppShell` + rota |

Páginas públicas (`PUBLIC_PATHS`: planos, ajuda, contato, privacidade, termos, lgpd, exclusão de conta) abrem com ou sem login. Logado em `/entrar`, volta para `/`.

O `StoreProvider` só monta (e assina o Firestore) depois do login e da escolha da igreja, e assina apenas o que o papel permite (menor privilégio).

### Entrada por código (sem aprovação)
A conta é criada **antes** de ler `codes` (a leitura exige login).

| Código | Gerado por | Quem usa | Resultado |
|---|---|---|---|
| criar igreja | — | qualquer pessoa logada | vira `admin` da nova igreja (`tenants/{id}` + `members/{uid}`) |
| `KIDS-XXXXXX` (invites) | admin (Usuários) | professor/recepção | entra com o papel escolhido, sem turmas; admin atribui turmas depois |
| `IG-XXXXXX` (joinCodes) | admin (Usuários → código de entrada dos pais) | pais | entra como `responsavel` e cadastra a própria família e filhos (assistente no app) |
| `LK-XXXXXX` (familyLinks) | equipe ou a própria família | outro responsável | entra na mesma família |

"Gerar novo" invalida o código anterior na hora. O admin também cria usuários direto na lista (usa um app Firebase secundário para não derrubar a própria sessão).

## Modelo de dados (Firestore)

Todo dado de negócio vive em `tenants/{churchId}/...`; o papel é **por igreja** (`tenants/{churchId}/members/{uid}.role`). Tabela completa de coleções, quem escreve e decisões: [`.claude/CONTEXTO.md`](../.claude/CONTEXTO.md), seção 3. Resumo:

- Topo: `users/{uid}` (perfil global + tokens de push), `users/{uid}/memberships/{churchId}` (lista "minhas igrejas"), `codes/{código}` (código → igreja; só `get`), `tenants/{churchId}`.
- Por igreja: `members`, `invites`, `joinCodes`, `familyLinks`, `pendingLinks`, `children`, `families`, `guardians`, `authorized`, `health`, `classes`, `roomStaff`, `badges`, `attendance`, `presence`, `calls`, `checkinRequests`, `notifications`, `audit`, `settings`, `meta`, `billing`.

### Decisões importantes
- **Sem entrada duplicada:** `presence/{childId}` + transação (`runTransaction`).
- **Saída:** valida pessoa autorizada/vigente (`validateCheckOut`) e encerra `presence` na mesma transação. Tentativas bloqueadas geram auditoria + alerta.
- **QR Code:** só token aleatório de 96 bits (`opaqueToken`). Ler o QR apenas *localiza* o cadastro; nunca libera retirada.
- **Saúde isolada** em `health/` com regra própria: professor lê só a das crianças das próprias turmas; família lê e edita as dos próprios filhos.
- **Fotos:** reduzidas no cliente (~320 px) e gravadas como data URL no documento (sem Cloud Storage).
- **Ids/códigos:** `CR-1001…` e `FAM-201…` via contador transacional em `meta/counters`.
- **Plano/cobrança:** `billing/current` só é escrito pelo servidor; teste de 14 dias e limite de crianças em `lib/billing.ts`.
- **Janela de dados:** presenças dos últimos 400 dias, 500 chamadas, 300 notificações/auditorias carregadas em tempo real.

## Cloud Functions (`functions/index.js`)
Push (FCM) ao criar chamada e pedido da família, aviso quando a família marca "estou indo", e callables `importFamily`, `claimFamilyLink`, `deleteMyAccount`. Detalhes em `.claude/CONTEXTO.md`, seção 6.

## Segurança (LGPD)
- Autorização real nas **Security Rules** (`firestore.rules`); a UI só espelha as permissões. Uma igreja nunca acessa dados de outra.
- Auditoria imutável; notificações sem dados sensíveis; sem dados pessoais no QR.
- Exclusão de conta dentro do app (`deleteMyAccount`) e página pública `/exclusao-de-conta`.
- Ainda **não** implementado: registro formal de consentimento por criança, expiração automática de crachá no servidor, retenção/anonimização.

## Próximos passos
Ver `.claude/CONTEXTO.md`, seção 10 (APNs/iOS, cobrança Mercado Pago, testes de regras dos pais, retenção LGPD, App Check, validação de retirada no servidor).
