# Espaço Kids — app mobile (Flutter)

Contexto completo do produto (web + mobile, banco, publicação): `../.claude/CONTEXTO.md` (seção 7 é o mobile). Este app é a pasta `mobile/` do monorepo; as skills `nova-versao` e `android-sha-fingerprints` ficam em `../.claude/skills/`.

- Backend: Firebase `espacokids-app` (Firestore multi-igreja em `tenants/{churchId}/...`). Regras e Cloud Functions ficam na raiz do monorepo (`../firestore.rules`, `../functions/`).
- Arquitetura: `lib/features/<feature>/{domain,data,presentation}`; telas usam providers (Riverpod), nunca o Firestore direto.
- **Para gerar versão (AAB/APK) é preciso pedir as chaves de assinatura no cofre: `android/key.properties` e `android/app/upload-keystore.jks`. Elas não vão para o git.** A Play Store exige AAB (`flutter build appbundle --release`) e `versionCode` maior que o último enviado.
