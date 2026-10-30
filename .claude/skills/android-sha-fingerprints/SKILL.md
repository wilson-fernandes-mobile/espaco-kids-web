---
name: android-sha-fingerprints
description: Use quando precisar do SHA1/SHA256 da chave de assinatura Android do Espaço Kids para o Firebase (login com Google), APIs do Google Cloud ou Play Console. Gatilhos: "sha1", "sha256", "fingerprint", "assinatura do app", "google sign-in não funciona", "ApiException: 10".
---

# SHA1 / SHA256 do app Android (Espaço Kids)

O login com Google só funciona se o SHA do keystore que assina o app estiver cadastrado no Firebase (projeto `espacokids-app`, app Android `1:479251880139:android:a274d44c87bbbe143e234e`). Sem isso dá `ApiException: 10`.

`keytool` não está no PATH: use o do Android Studio (`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`).

## Debug (flutter run)

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v `
  -keystore "$env:USERPROFILE\.android\debug.keystore" `
  -alias androiddebugkey -storepass android -keypass android 2>&1 | Select-String "SHA1|SHA256"
```

## Release (upload key: `mobile/android/app/upload-keystore.jks`)

A senha está em `mobile/android/key.properties` (`storePassword`). Não imprima a senha na conversa.

```powershell
$p = (Get-Content android\key.properties | ? { $_ -like 'storePassword=*' }) -replace 'storePassword=',''
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v `
  -keystore android\app\upload-keystore.jks -alias upload -storepass $p 2>&1 | Select-String "SHA1|SHA256"
```

## Chave da Play Store (Play App Signing)

Apps instalados pela loja são assinados pela Google, não pela upload key. Pegue o SHA em Play Console → Configuração → Integridade do app → Assinatura de app, e cadastre também.

## Cadastrar no Firebase

```powershell
firebase apps:android:sha:create 1:479251880139:android:a274d44c87bbbe143e234e <SHA1-ou-SHA256> --project espacokids-app
```

Este app **não usa** `google-services.json` (usa `mobile/lib/firebase_options.dart`), então não precisa baixá-lo; o Client ID web e o do iOS já estão em `mobile/lib/features/auth/data/auth_repository.dart`.
