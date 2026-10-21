# Firebase — configuração e operação

Projeto: **espacokids-app** (console: https://console.firebase.google.com/project/espacokids-app)
App web: `Espaco Kids Web` — `1:479251880139:web:a012688609fa92673e234e`

## Ambiente
O Firebase CLI exige Node ≥ 20. No Windows (nvm-windows):

```powershell
nvm use 22.14.0
firebase login            # já feito
```

## Variáveis (.env)
`.env` (ignorado pelo git) e `.env.example` contêm `VITE_FIREBASE_*`. A chave web do Firebase é pública por design; a proteção são as **Security Rules**.

## Passo manual obrigatório (1x): habilitar login por e-mail/senha
Console → **Authentication → Começar → Método de login → E-mail/senha → Ativar → Salvar**.
Sem isso o login mostra "Login por e-mail/senha não está habilitado".

## Primeiro uso
1. `bun install` · `bun run dev` → http://localhost:8080
2. Tela de login → **Criar cadastro** → criar a igreja (a pessoa vira admin dela). Cada igreja é independente (`tenants/{churchId}`).
3. Em **Usuários e permissões**, gere o **código de convite** (`KIDS-`, professor/recepção) e o **código de entrada dos pais** (`IG-`). Coordenação e outros admins você cria direto na lista.
4. Em **Configurações → Dados**, carregue dados fictícios (opcional) ou cadastre turmas.

## Publicar regras e índices
```powershell
nvm use 22.14.0
firebase deploy --only firestore --project espacokids-app   # regras + índices
firebase deploy --only functions --project espacokids-app   # Cloud Functions (Node 22)
firebase deploy --only hosting --project espacokids-app     # após bun run build
```
Rode o deploy de regras sempre que alterar `firestore.rules` ou `firestore.indexes.json`. Ao mudar o modelo de dados, publique regras e hosting juntos.

## Domínios autorizados
Ao publicar o site, adicione o domínio em Authentication → Configurações → Domínios autorizados (`localhost` já vem liberado).

## Cuidados
- Dados reais de crianças: só depois de revisar as regras, habilitar App Check e definir o responsável pela LGPD.
- Plano Spark (gratuito) tem cotas diárias de leitura/escrita do Firestore; monitore no console.
