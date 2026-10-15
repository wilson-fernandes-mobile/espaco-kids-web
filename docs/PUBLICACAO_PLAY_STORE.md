# Publicação na Play Store (Espaço Kids)

## Chave de assinatura (upload key)

Gerada em 2026-10-15 com:

```
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload \
  -dname "CN=Espaco Kids, OU=Ministerio Infantil, O=Mova Software, C=BR"
```

- Localização: `android/app/upload-keystore.jks` (nunca commitar; já está no `.gitignore`).
- Credenciais em `android/key.properties` (também gitignored):
  ```
  storePassword=...
  keyPassword=...
  keyAlias=upload
  storeFile=upload-keystore.jks
  ```
- É uma chave **só do Espaço Kids** (não reaproveita a do MovaChurch).
- **Backup obrigatório**: guarde `upload-keystore.jks` e `key.properties` num gerenciador de senhas ou cofre, fora deste PC e fora do Git. Sem a chave não dá para enviar atualizações (com o Play App Signing ligado, dá para pedir à Google o reset da upload key, mas é um processo lento).

O `android/app/build.gradle.kts` lê `key.properties` e assina o `release` com essa chave. Sem `key.properties` o build de release falha de propósito (não cai na chave de debug).

## Play App Signing

Na primeira publicação, mantenha marcado **Play App Signing** (padrão). A chave deste projeto é só a de **upload**; a Google guarda a chave final de assinatura. Depois de criar o app na Play Console, pegue o SHA-1/SHA-256 em **Configuração → Integridade do app → Assinatura de app** e cadastre no Firebase (junto com o da upload key) para o login com Google funcionar nas versões da loja. Use a skill `android-sha-fingerprints`.

## Gerar uma nova versão

Use a skill `nova-versao` (`.claude/skills/nova-versao`): faz o bump de versão no `pubspec.yaml`, roda `flutter build appbundle` e valida a assinatura.

Saída: `build/app/outputs/bundle/release/app-release.aab`.

## Upload manual

O envio para a Play Console é manual (login na conta de desenvolvedor): crie o app com o pacote `com.mova.software.espaco.kids.espaco_kids` e envie o `.aab`.
