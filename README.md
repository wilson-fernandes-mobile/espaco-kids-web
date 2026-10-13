# Espaço Kids (app)

App Flutter para check-in e check-out seguro de crianças no ministério infantil/creche, para **professores**, **recepção** e **famílias** (pais, avós e outros autorizados).

Usa o mesmo Firebase (`espacokids-app`) do painel web (`C:\Users\wilso\Documents\GIT_SISTEMA\EspacoKids`). Layout e design system herdados do MoveScheduler.

Mapeamento completo (perfis, fluxos, telas, arquitetura, dados, segurança): [`docs/MOBILE.md`](docs/MOBILE.md).

## Rodar

```bash
flutter pub get
flutter run
flutter test
flutter analyze
```

## Estrutura

`core/` (tema, rotas, erros, utilitários) · `shared/widgets/` · `features/{auth,kids,checkin,calls,staff,family,settings}/{domain,data,presentation}`.
