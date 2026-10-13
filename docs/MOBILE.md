# App mobile (Flutter) — mapeamento

Projeto: `C:\Users\wilso\Documents\GIT_PESSOAL\espaco_kids` (pacote `com.mova.software.espaco.kids.espaco_kids`).
Backend: **o mesmo projeto Firebase do painel web** (`espacokids-app`). Apps Android e iOS já registrados no Firebase; `lib/firebase_options.dart` já está preenchido.

Base de layout: **MoveScheduler / MovaChurch** (`C:\Users\wilso\StudioProjects\MoveScheduler`) — mesma paleta, tipografia **Inter** (google_fonts), espaçamentos múltiplos de 4, cards com raio 16, botões raio 12, `NavigationBar` no celular e `NavigationRail` no tablet, tema claro/escuro e escolha de cor.

## Quem usa o app

| Perfil | Quem é | O que faz |
|---|---|---|
| **Professor(a)** | equipe da creche | vê as turmas, quem está na sala, ficha da criança, **chama os responsáveis** (WhatsApp/ligação), lê o crachá |
| **Recepção** | balcão de entrada/saída | tudo do professor + **entrada e saída**, confirma os pedidos das famílias |
| **Coordenação / Admin** | gestão | igual à recepção no app; cadastros e relatórios continuam no painel web |
| **Família** (`responsavel`) | pais, avós, tios e outros que fazem o check-in | vê os filhos e se estão na sala, pede **"Estou chegando"** / **"Vou buscar"**, vê quem está autorizado, recebe e responde **chamadas** |

Cada familiar cria a **própria conta** (um e-mail por pessoa) com o **código da família** (`LK-XXXXXX`) e diz quem é na lista de responsáveis/autorizados. Assim a recepção sabe exatamente *quem* está entregando ou retirando.

## Fluxos principais

**Cadastro (sem aprovação, por código)** — `Criar conta com código`
- Família → código `LK-XXXXXX` (gerado no painel web: *Famílias → família → Acesso ao aplicativo*).
- Equipe → código `KIDS-XXXXXX` (painel web: *Usuários e permissões*), escolhendo Professor(a) ou Recepção.

**Entrada pela família**
1. Pai/mãe toca **Estou chegando** → cria `checkinRequests` (pendente).
2. Recepção vê o pedido em **Início → Pedidos das famílias** e toca **Confirmar** → o app valida as regras e grava a entrada oficial (`presence` + `attendance`).

**Saída pela família**
1. Familiar toca **Vou buscar** (a conta identifica quem é).
2. Recepção confirma → o app valida que a pessoa está na lista de **autorizados e vigente**; se não estiver, **bloqueia**, registra auditoria e avisa a coordenação.

**Saída/entrada no balcão (sem app da família)**: aba **Crachá** lê o QR (`EK:<token>`), abre a ficha e a recepção escolhe quem entrega/retira.

**Chamada**: professor abre a ficha de uma criança *na sala* → **Chamar responsáveis** → motivo. A família vê em **Avisos** e responde **Estou indo**; a equipe encerra em **Chamadas**.

## Telas

```
Login · Criar conta (família | equipe) · Conta bloqueada
Equipe  (abas): Início · Crianças · Crachá (scanner) · Chamadas · Perfil
                 └ Ficha da criança (entrada, saída, chamar, contatos, autorizados)
Família (abas): Meus filhos · Autorizados · Avisos · Perfil
Perfil: dados, tema claro/escuro/sistema, cor do app, sair
```

## Arquitetura (feature-first, camadas)

```
lib/
├─ main.dart · app.dart · firebase_options.dart
├─ core/
│  ├─ constants/app_role.dart        papéis e permissões de alto nível
│  ├─ errors/                        Failure + tradução de erros para pt-BR
│  ├─ firebase/firebase_providers    únicas instâncias do Firebase (injeção)
│  ├─ router/app_router.dart         go_router + redirect por sessão/papel + shell por papel
│  ├─ services/                      SharedPreferences
│  ├─ theme/                         cores, tipografia, espaçamento, tema (herdado do MoveScheduler)
│  └─ utils/                         datas, telefone BR/WhatsApp, iniciais
├─ shared/widgets/                   AppScaffold, PatternCard, StatCard, StatusBadge, EmptyState,
│                                    PersonAvatar, ChildTile, feedback (snackbars/confirm)…
└─ features/<feature>/
   ├─ domain/      entidades puras e regras (sem Flutter/Firebase)
   ├─ data/        repositórios (único código que fala com o Firestore)
   └─ presentation/ providers (Riverpod) + screens + widgets
      auth · kids · checkin · calls · staff · family · settings
```

Regras de ouro: **telas não falam com o Firestore** (usam providers → repositórios); **regras de negócio ficam em `domain/`** e têm testes (`test/widget_test.dart`); permissões reais ficam nas **Security Rules**, a UI só espelha.

## Dados e segurança (Firestore)

Reaproveita as coleções do painel web (`children`, `families`, `guardians`, `authorized`, `classes`, `presence`, `attendance`, `calls`, `notifications`, `audit`, `badges`, `users`) e acrescenta:

| Coleção | Uso |
|---|---|
| `familyLinks/{LK-XXXXXX}` | código de vínculo da família → `familyId`, `active`. Criado pela equipe; lido por `get` no cadastro |
| `checkinRequests/{id}` | pedido "estou chegando"/"vou buscar" feito pela família; a equipe confirma/recusa |
| `users/{uid}` (`role: responsavel`) | `familyId`, `linkCode`, `personId`/`personKind` (quem é na família) |
| `calls.familyId` | permite à família ver as chamadas dos seus filhos |

Regras (`firestore.rules`, já publicadas): a família só lê **os próprios filhos/pessoas/chamadas/presença**; nunca `health`, `settings`, `audit`, `users`, `badges`. Só pode criar pedido para filho da própria família, cancelar o próprio pedido pendente e marcar "estou indo" nas chamadas. `isStaff()` agora exclui o perfil `responsavel`.
O painel web **não** abre para contas de família (mostra "acesso não liberado").

## Como rodar

```powershell
cd C:\Users\wilso\Documents\GIT_PESSOAL\espaco_kids
flutter pub get
flutter run            # Android/iOS
flutter test           # regras de entrada/saída
flutter analyze
```

Antes do primeiro teste: habilitar **Authentication → E-mail/senha** (já feito para o web), gerar um **código de família** no painel e criar a conta no app.

## Fora do escopo desta fase (próximos passos)

1. ~~Push (FCM)~~ **feito**: `functions/index.js` (Cloud Functions, Blaze) avisa a família a cada chamada e a recepção a cada pedido da família; o app grava o token em `users/{uid}.fcmTokens` (`lib/core/push/push_service.dart`). Publicar com `firebase deploy --only firestore,functions --project espacokids-app`. Falta no iOS: chave APNs no Firebase (Project Settings > Cloud Messaging).
2. **QR pessoal do familiar** (mostrar o QR no app para a recepção ler) e crachá digital da criança.
3. Família **adicionar autorizado temporário** pelo app (hoje é com a recepção).
4. Validação de retirada **no servidor** (Cloud Functions) em vez de só no app.
5. Ícone/splash do app (`flutter_launcher_icons` já configurado, falta rodar), publicação nas lojas, App Check.
