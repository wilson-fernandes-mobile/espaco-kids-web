# Espaço Kids — contexto completo (web + mobile)

Leia este arquivo primeiro. Ele resume o que o produto faz, onde cada parte mora, como os dados são guardados, como publicar e o que ainda falta. Detalhes extras estão em `docs/` (ARQUITETURA, FIREBASE, MOBILE, IMPRESSORA); onde `docs/` e este arquivo divergirem, vale este (os docs são anteriores à migração multi-igreja).

## 1. O que é

Sistema de gestão do **ministério infantil de igrejas** (creche/escolinha bíblica), vendido para várias igrejas (SaaS multi-igreja). Faz:

- cadastro de crianças, famílias, responsáveis e pessoas autorizadas a buscar;
- turmas (salas) por faixa etária;
- **check-in / check-out** com crachá QR (`EK:<token>`), sem entrada duplicada e com validação de quem pode retirar;
- **chamada dos responsáveis** pelo professor (push + WhatsApp/ligação);
- pedidos da família pelo app ("Estou chegando" / "Vou buscar"), confirmados pela recepção;
- **saúde e cuidados** da criança (alergias, TEA/TDAH, medicação com horários), em área restrita;
- relatórios, notificações, auditoria imutável, usuários e permissões;
- site público (landing, planos, políticas, ajuda) e exclusão de conta (exigência Google/Apple).

Dois clientes, **um backend**: painel web (equipe) e app Flutter (equipe + famílias).

## 2. Repositórios e pastas

| Parte | Pasta local | GitHub |
|---|---|---|
| Web (painel + site) | `C:\Users\wilso\Documents\GIT_SISTEMA\EspacoKids` | `wilson-fernandes-mobile/espaco-kids-web` (branch `main`) |
| Mobile (Flutter) | `C:\Users\wilso\Documents\GIT_PESSOAL\espaco_kids` | `wilson-fernandes-mobile/espaco-kids-app` (branch `main`) |

O mobile **não** está dentro do repositório web. As Cloud Functions, as Security Rules e os índices do Firestore ficam no repositório **web** e servem aos dois.

Projeto Firebase único: **`espacokids-app`** (console: https://console.firebase.google.com/project/espacokids-app). Hosting: https://espacokids-app.web.app. Região das functions: `us-central1`. Plano Blaze.

## 3. Onde os dados ficam (banco de dados)

**Cloud Firestore** (NoSQL, tempo real). Não há outro banco nem servidor próprio. Autenticação: **Firebase Auth** (e-mail/senha; Google e Apple no app). Fotos: reduzidas no cliente (~320 px) e gravadas como data URL dentro do documento (não usa Cloud Storage).

### Modelo multi-igreja (tenants)

Todo dado de negócio vive em `tenants/{churchId}/...`. Uma igreja nunca lê dados de outra. O papel da pessoa é **por igreja** (a mesma conta pode ser admin numa e família noutra).

Coleções de topo:

| Caminho | Conteúdo |
|---|---|
| `users/{uid}` | perfil global: `name`, `email`, `createdAt`, `fcmTokens` (push). Sem papel. |
| `users/{uid}/memberships/{churchId}` | cópia só para listar "minhas igrejas" (a verdade é `members`) |
| `codes/{CÓDIGO}` | código público → `{churchId, churchName, kind: invite|family|join}`. Só `get` por código, nunca lista |
| `tenants/{churchId}` | dados da igreja (`createdBy`, `createdAt` = início do teste grátis, imutável) |

Subcoleções de `tenants/{churchId}`:

| Subcoleção | Conteúdo | Quem escreve |
|---|---|---|
| `members/{uid}` | vínculo: `role` (`admin`, `coordenacao`, `recepcao`, `professor`, `responsavel`), `classIds`, `active`, `familyId`, `photoUrl` | admin; autocadastro por código |
| `invites/{KIDS-XXXXXX}` | convite da equipe (professor/recepção) | admin |
| `joinCodes/{IG-XXXXXX}` | código de entrada dos pais (um por igreja) | admin |
| `familyLinks/{LK-XXXXXX}` | vínculo para outro responsável entrar na mesma família | equipe ou a própria família |
| `pendingLinks/{uid}` | pendência criada por `importFamily` | só servidor |
| `children`, `families`, `guardians`, `authorized` | cadastros (família = doc com id do usuário que a criou) | equipe de cadastro; a família edita os seus |
| `health/{childId}` | **saúde** isolada (formato em `src/lib/domain/care.ts` e `care_profile.dart`) | coordenação; família dos próprios filhos; professor da turma só lê |
| `classes` | turmas | coordenação/admin |
| `roomStaff/{uid}` | equipe com check-in numa sala | a própria pessoa |
| `badges` | crachás; `token` aleatório de 96 bits | recepção+ |
| `attendance` | histórico de entradas/saídas | recepção+ |
| `presence/{childId}` | "presente agora" (trava anti-duplicidade) | recepção+ |
| `calls` | chamadas aos responsáveis (+ `history`) | equipe; família só marca "estou indo" |
| `checkinRequests` | pedidos da família | família cria/cancela; recepção resolve |
| `notifications` | central de eventos | equipe |
| `audit` | auditoria imutável (create-only) | equipe; leitura só coordenação |
| `settings/church` | nome, cores, logo, crachá, regras | admin |
| `meta/counters` | contadores dos códigos `CR-1001`, `FAM-201` | recepção+ |
| `billing/current` | plano/cobrança: `{plan, status, paidUntil}` | **só servidor** (regra bloqueia o cliente) |

### Decisões que não podem ser quebradas
- A autorização real está em **`firestore.rules`**; a UI só espelha. Mudou regra → rodar os testes e publicar.
- `get()` em doc inexistente derruba a regra: todo uso de `role()` vem depois de `isMember()`.
- **Sem entrada duplicada:** `presence/{childId}` + transação.
- **Saída:** valida pessoa autorizada e vigente; tentativa bloqueada gera auditoria + alerta.
- **QR** só localiza o cadastro; nunca libera retirada.
- Cadastro por código: a conta é criada **antes** de ler `codes` (a leitura exige login).
- Papéis: família só vê os próprios filhos; nunca `health` de outros, `settings`, `audit`, `badges`.

## 4. Planos e cobrança

Definidos em `src/lib/billing.ts` (limites) e `src/lib/site.ts` (preços exibidos):

| Plano | Limite de crianças ativas | Preço (site) |
|---|---|---|
| Início | 30 | grátis |
| Crescimento | 100 | R$ 45,90/mês |
| Expansão | 250 | R$ 79,90/mês |
| Ilimitado | sem limite | R$ 149,90/mês (ou sob consulta) |

Toda igreja nova tem **14 dias de teste** com o limite do Expansão; depois volta ao Início até assinar. `resolvePlan()` decide o estado. O doc `billing/current` só pode ser escrito pelo servidor.
**Estado:** a cobrança automática (Mercado Pago) **ainda não está implementada** neste projeto — hoje o pagamento é combinado por contato e o doc é preenchido manualmente (Admin SDK/console). Preços são valores de partida a confirmar.

## 5. Web (este repositório)

Stack: TanStack Start (SPA estática) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · react-hook-form + zod · Recharts · qrcode.react + jsQR · Firebase JS SDK 13. Gerenciador: bun (ou npm). Node ≥ 20 (usar 22.14.0 via nvm-windows para o Firebase CLI).

```
src/
├─ routes/                 telas (file-based). chamadas, checkin, configuracoes, criancas/, familias,
│                          notificacoes, relatorios, turmas, usuarios, crachas, registrar, entrar,
│                          + páginas públicas: planos, ajuda, contato, privacidade, termos-de-uso, lgpd, exclusao-de-conta
├─ components/app/         shell, login-screen, church-picker, badge-card, qr-scanner, care-panel, plan-banner…
├─ components/site/        landing e layout do site público
├─ components/ui/          shadcn (não editar sem necessidade)
└─ lib/
   ├─ firebase/client.ts   init do Firebase (lê VITE_FIREBASE_*)
   ├─ auth.tsx             AuthProvider: sessão, igrejas do usuário, status
   ├─ store.tsx            StoreProvider: assinaturas em tempo real + ações (ÚNICO acesso a dados)
   ├─ billing.ts · site.ts · csv.ts · photo.ts · whatsapp.ts · tema.ts
   └─ domain/              regras puras (types, rules, labels, care, mock)
```

Regra de ouro: componentes **não** falam com o Firestore; usam `useStore()`. Regras de negócio em `domain/rules.ts`.

**Gate** (`routes/__root.tsx`): `loading` → Splash · `signed-out` → landing em `/`, login em `/entrar`, cadastro em `/registrar` · `needs-church` → ChurchPicker · `no-profile`/`inactive` → bloqueado · pronto → `StoreProvider` + `AppShell`. Caminhos públicos (`PUBLIC_PATHS`) abrem com ou sem login. O `StoreProvider` só assina o que o papel permite.

Variáveis: `.env` (ignorado) e `.env.example` com `VITE_FIREBASE_*`. A chave web do Firebase é pública por design; a proteção são as Security Rules.

Comandos:
```sh
bun install && bun run dev          # http://localhost:8080 (porta fixa no vite.config.ts)
bun run build                       # gera dist/client (SPA, fallback _shell.html)
bun run test                        # vitest
bun run lint
```
Não existe `tsconfig.json` na raiz (só `src/tsconfig.json`); `vite build` é a checagem de tipos/compilação usada.

Skills úteis em `.claude/skills/`: `firebase-deploy`, `novo-modulo`, `verificar-projeto`.

## 6. Cloud Functions (`functions/index.js`, Node 22, 2ª geração)

| Função | Gatilho | O que faz |
|---|---|---|
| `onCallCreated` | doc novo em `calls` | push para a família da criança |
| `onCheckinRequestCreated` | doc novo em `checkinRequests` | push para recepção/coordenação/admin |
| `onCallAcknowledged` | `calls` atualizado | quando a família marca "estou indo", avisa quem fez a chamada (ou a recepção/coordenação/admin se não houver autor) |
| `importFamily` | callable | leva filhos (e responsáveis/autorizados, opcionalmente saúde) de uma igreja para outra do mesmo usuário |
| `claimFamilyLink` | callable | quem ficou pendente entra na família importada sem digitar código |
| `deleteMyAccount` | callable | apaga a conta (vínculos, perfil, tokens, login); exige login recente (5 min); não deixa igreja sem admin |

Tokens FCM ficam em `users/{uid}.fcmTokens`; tokens inválidos são removidos no envio.

## 7. Mobile (Flutter)

Pacote `com.mova.software.espaco.kids.espaco_kids`. Flutter 3.29.3 (SDK em `C:\Users\wilso\Documents\SDK\flutter_windows_3.29.3-stable\flutter`). Estado: Riverpod · rotas: go_router · Firebase: core/auth/firestore/functions/messaging · login social Google e Apple · mobile_scanner (QR) · image_picker · layout herdado do MoveScheduler/MovaChurch (Inter, raio 16/12).

Arquitetura feature-first em `lib/features/<feature>/{domain,data,presentation}`: `auth`, `tenant` (escolher/criar igreja, `/igrejas`), `kids`, `checkin`, `calls`, `family`, `staff`, `settings`. `lib/core/` tem router, tema, push (`push_service.dart`), erros, utilidades. Telas não falam com o Firestore: providers → repositórios (`data/`).

Perfis: Professor, Recepção, Coordenação/Admin (mesmo app; cadastros pesados ficam no painel web) e Família (`responsavel`). Fluxo dos pais: criar conta → código `IG-` da igreja → assistente de 4 passos (`/cadastro-familia`: seus dados, filhos, quem pode buscar, código da família) → `/saude/:id` para saúde. Equipe entra com `KIDS-` e escolhe Professor ou Recepção. Fluxos de entrada/saída e chamada estão descritos em `docs/MOBILE.md`.

Comandos:
```powershell
cd C:\Users\wilso\Documents\GIT_PESSOAL\espaco_kids
flutter pub get
flutter run                 # Android/iOS
flutter analyze
flutter test
```

### Gerar versão para a Play Store — LEIA ANTES

> **As chaves de assinatura NÃO estão no git.** Para gerar uma versão publicável é preciso **pedir as chaves ao responsável (guardadas no cofre)** e colocá-las em `android/`:
> - `android/key.properties` (alias, senhas, caminho do keystore)
> - `android/app/upload-keystore.jks` (chave de upload)
>
> Ambos estão no `.gitignore` de propósito. **Nunca** os commite, cole em chat ou envie por e-mail. Sem `key.properties` o build de release **falha** (o projeto não cai na chave de debug, de propósito). Quem perder o `.jks` e a senha precisa pedir redefinição da chave de upload à Google Play.
> Para iOS, as credenciais de assinatura/APNs também ficam fora do repositório (conta Apple Developer do responsável).
> Os arquivos `google-services.json` / `GoogleService-Info.plist` e `lib/firebase_options.dart` vêm do projeto Firebase `espacokids-app`.

Passos (com as chaves no lugar):
1. Aumentar `version:` em `pubspec.yaml` (`nome+versionCode`). O `versionCode` (número depois do `+`) **precisa ser maior** que o último enviado à Play.
2. A Play Store aceita **AAB**, não APK: `flutter build appbundle --release` → `build/app/outputs/bundle/release/app-release.aab`.
3. Para distribuir fora da loja (testers diretos): `flutter build apk --release` → `build/app/outputs/flutter-apk/app-release.apk`. Conferir assinatura: `apksigner verify --print-certs app-release.apk` (SDK `build-tools`).
4. Envio à loja: Play Console (teste interno/fechado → produção). A política de privacidade e a URL de exclusão de conta vêm do site (`/privacidade`, `/exclusao-de-conta`).

Versão em 2026-10-21: `1.0.4+4`.

## 8. Publicar (web e backend)

Pré-requisito: Node 22 (`nvm use 22.14.0`) e `firebase login` na conta dona do projeto.

```sh
# Painel/site
bun run build
firebase deploy --only hosting --project espacokids-app
# Regras e índices (sempre que mexer em firestore.rules / firestore.indexes.json)
firebase deploy --only firestore --project espacokids-app
# Functions
firebase deploy --only functions --project espacokids-app
```
Publique **regras e web juntos** quando mudar o modelo de dados, senão a versão antiga do web quebra. Domínios novos precisam ser adicionados em Authentication → Domínios autorizados. E-mail/senha precisa estar habilitado em Authentication.

Testes de regras: `scripts/rules.test.mjs` com o emulador do Firestore (exige **JDK 21**; porta 8089, config em `scripts/firebase.rules-test.json`). `scripts/seed-mock.js` cria dados e contas de teste mas usa o fluxo antigo (equipe cadastra família) e precisa de `gcloud auth application-default login`.

## 9. Segredos e acesso (nada disso está no git)

- Chaves Android (`key.properties`, `.jks`): cofre do responsável (ver seção 7).
- Conta Firebase/Google Cloud do projeto `espacokids-app` (Blaze) e conta Apple Developer: com o responsável.
- Chave APNs do push no iPhone: precisa ser criada na Apple e enviada ao Firebase (Project Settings → Cloud Messaging). Não revogar a chave de outro produto da mesma conta Apple.
- `.env` do web: copie de `.env.example`.

## 10. Pendências conhecidas

- Push no iPhone (APNs) e build iOS (precisa de Mac).
- Cobrança automática (Mercado Pago) e preços finais; preencher placeholders do site em `src/lib/site.ts` (razão social, CNPJ, endereço, e-mails, data) e o foro em `termos-de-uso`.
- Testes de regras no emulador com cenários dos pais (joinCodes, família cria `families/{uid}`, saúde, familyLinks); ajustar `seed-mock.js` ao fluxo `IG-`.
- Revisão periódica (6 meses) do cadastro de saúde; registrar quem fez check-in/out (nomes) na presença.
- Retenção/anonimização LGPD, consentimento por criança, App Check, validação de retirada no servidor, expiração de crachá no servidor.
- Ícone do launcher: confirmar se já é o logo do Espaço Kids.
- Alertas de orçamento no Google Cloud ainda não criados.
