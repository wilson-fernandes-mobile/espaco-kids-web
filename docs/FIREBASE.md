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
1. `bun install` · `bun run dev` → http://localhost:5173
2. Tela de login → **Criar cadastro → Cadastrar igreja** (só funciona uma vez).
3. Em **Configurações → Dados**, carregue os dados fictícios (opcional) ou cadastre turmas e famílias.
4. Em **Usuários e permissões**, gere o **código de convite** e passe para professores/recepção: eles usam **Criar cadastro → Entrar com código**. Coordenação e outros admins você cria direto na lista.

## Publicar regras e índices
```powershell
nvm use 22.14.0
firebase deploy --only firestore --project espacokids-app
```
Sempre que alterar `firestore.rules` ou `firestore.indexes.json`.

## Domínios autorizados
Ao publicar o site, adicione o domínio em Authentication → Configurações → Domínios autorizados (`localhost` já vem liberado).

## Cuidados
- Dados reais de crianças: só depois de revisar as regras, habilitar App Check e definir o responsável pela LGPD.
- Plano Spark (gratuito) tem cotas diárias de leitura/escrita do Firestore; monitore no console.
