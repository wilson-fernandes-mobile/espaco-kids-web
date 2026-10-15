---
name: nova-versao
description: Faz o bump de versão do app (pubspec.yaml) e gera o Android App Bundle (.aab) assinado para publicar na Play Store. Use quando o usuário pedir para gerar uma nova versão/release, subir o app bundle, ou preparar o app para a Play Store.
---

# Nova versão (release Android) — Espaço Kids

Automatiza o fluxo de `docs/PUBLICACAO_PLAY_STORE.md`: bump de versão + build do bundle assinado.

## Args

`args` pode vir vazio, ou como:
- `patch` / `minor` / `major`: incrementa essa parte do versionName (semver) e zera as menores.
- Uma versão explícita, ex.: `1.4.0`.

Se vazio, pergunte se quer patch, minor, major ou a versão exata.

## Passos

1. **Ler a versão atual** em `pubspec.yaml` (`version: X.Y.Z+B`; `X.Y.Z` é o versionName e `B` o versionCode).
2. **Calcular a nova versão:** o `versionCode` sempre sobe `+1` (a Play Console exige um código maior a cada envio). O `versionName` segue o bump pedido.
3. **Editar `pubspec.yaml`** com `novoVersionName+novoVersionCode`.
4. **Checar a assinatura** antes do build: `android/key.properties` e `android/app/upload-keystore.jks` precisam existir. Se faltar, pare e avise. Nunca gere uma keystore nova sozinho: isso impediria atualizar um app já publicado.
5. **Build:** `flutter build appbundle`.
6. **Validar a assinatura** do bundle:
   ```
   "C:\Program Files\Android\Android Studio\jbr\bin\jarsigner.exe" -verify -verbose -certs build\app\outputs\bundle\release\app-release.aab
   ```
   O certificado deve ser `CN=Espaco Kids, OU=Ministerio Infantil, O=Mova Software, C=BR` (não a chave de debug).
7. **Reportar:** versão anterior → nova, e o caminho `build/app/outputs/bundle/release/app-release.aab`. O envio à Play Console é manual.

## Não fazer

- Não commitar nem dar push do bump sem o usuário pedir.
- Não gerar keystore nova.
- Não tentar subir o bundle para a Play Console.
