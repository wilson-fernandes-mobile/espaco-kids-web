# Espaço Kids — app mobile (Flutter)

Contexto completo do produto (web + mobile, banco, publicação) está no repositório web: `C:\Users\wilso\Documents\GIT_SISTEMA\EspacoKids\.claude\CONTEXTO.md` (GitHub: `wilson-fernandes-mobile/espaco-kids-web`). Leia a seção 7 para o mobile.

- Backend: Firebase `espacokids-app` (Firestore multi-igreja em `tenants/{churchId}/...`). Regras e Cloud Functions ficam no repo web.
- Arquitetura: `lib/features/<feature>/{domain,data,presentation}`; telas usam providers (Riverpod), nunca o Firestore direto.
- **Para gerar versão (AAB/APK) é preciso pedir as chaves de assinatura no cofre: `android/key.properties` e `android/app/upload-keystore.jks`. Elas não vão para o git.** A Play Store exige AAB (`flutter build appbundle --release`) e `versionCode` maior que o último enviado.
