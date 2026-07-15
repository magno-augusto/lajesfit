# M8 - Notificacoes + FCM

Status: **RASCUNHO, aguardando aprovacao do usuario** (escrito em 2026-07-10). Nao implementar antes
da aprovacao humana (gate de spec-driven development). Este e' o ultimo marco do plano M0-M8.

## Objetivo

Trazer para o app Android nativo duas coisas que hoje so existem no web:

1. **Inbox de notificacoes** - a lista de notificacoes com "marcar todas como lidas" (espelhando
   `src/features/notifications/NotificationsSheet.tsx`), que **ainda nao existe no Android**.
2. **Push real via Firebase Cloud Messaging (FCM)** - receber notificacao no celular mesmo com o
   app fechado, e abrir a tela certa ao tocar (deep link).

Sem reinventar backend: mesmo Supabase, mesmas notificacoes, mesmas preferencias por tipo. A infra
de push do servidor (tabela `push_subscriptions`, trigger `request_push_delivery`, endpoint
`/api/push/send`) ja existe para o Web Push do PWA e e' **estendida** para tambem falar FCM, nao
duplicada.

## Estado atual (lido em 2026-07-10)

- **Android**: NAO existe feature de notificacoes. So ha as *preferencias* por tipo, implementadas
  no M7 em `feature/settings/*` (`notify_likes/comments/follows/challenges`). Nenhuma inbox, nenhum
  FCM, nenhum `FirebaseMessagingService`.
- **Backend/web (fonte da verdade a espelhar):**
  - `notifications` (colunas: `id, user_id, actor_id, type, post_id, comment_id, board,
    podium_event_id, pushed_at, read_at, created_at`). Tipos do enum `notification_type`: `like`,
    `comment`, `follow`, `challenge_join`, `challenge_dethroned`, `challenge_podium`.
  - `push_subscriptions` (hoje so Web Push): `id, user_id, endpoint NOT NULL UNIQUE, p256dh NOT
    NULL, auth NOT NULL, created_at`. RLS `auth.uid() = user_id` (usuario gere as proprias).
  - `request_push_delivery()` (migration `20260718120000`, atualizada em `20260721120000` pelo
    podio): dispara `POST /api/push/send {notificationId}` quando o tipo esta em `('like',
    'comment', 'follow', 'challenge_dethroned', 'challenge_podium')`. **`challenge_join` nao gera
    push** (so aparece na inbox). E' agnostico de plataforma - nao precisa mudar.
  - `src/routes/api/push/send.ts`: Web Push/VAPID. Faz "claim" atomico via `pushed_at`
    (idempotente), monta payload por tipo em `buildPayload`, envia com `web-push`, e poda inscricoes
    mortas nos erros 404/410.
  - **Preferencias**: `profiles.notifications_enabled` (interruptor geral) + os quatro
    `notify_*`. A filtragem acontece no **INSERT** (os triggers nem criam a linha de `notifications`
    se a preferencia estiver desligada). Consequencia importante: o push **ja respeita as
    preferencias automaticamente** - se a notificacao nao foi criada, nao ha o que enviar.

## Comportamento do web a espelhar (inbox)

Lido em `src/features/notifications/NotificationsSheet.tsx` e `notifications-api.ts`:

- `fetchNotifications(userId, limit=30)`: le as ultimas notificacoes com o ator (`display_name`,
  `username`, `avatar_url`), ordenadas por `created_at desc`.
- Marcar todas como lidas ao abrir (atualiza `read_at`).
- Texto e icone por tipo; navegacao (deep link) por tipo:
  - `like` / `comment` -> feed (`/feed`).
  - `follow` -> perfil do ator (`/profile/{username}`).
  - `challenge_dethroned` / `challenge_podium` -> desafios (`/desafio`, com `?podio={id}` quando
    houver `podium_event_id`).
  - `challenge_join` -> desafios (`/desafio`).

## Fora de escopo

- Mexer no Web Push existente do PWA (continua funcionando; so ganha um "irmao" FCM no `send.ts`).
- Sincronizacao em background / `WorkManager` / agrupamento de notificacoes (Fase 2).
- Novas preferencias de notificacao - as quatro do M7 bastam.
- Qualquer coisa no `android-twa/`.

## Arquitetura no Android

### Inbox (`feature/notifications/`)
- `NotificationsRepository` (Postgrest via supabase-kt), `NotificationsViewModel`
  (`UiState`/`StateFlow`), `NotificationsScreen` (ou bottom sheet) + modelos `@Serializable` com
  `@SerialName` batendo as colunas de `notifications`/`profiles`. `@Preview(showBackground = true)`
  obrigatorio.
- **Ponto de entrada**: sino na top bar autenticada (a top bar do M7 ja existe; ganha o sino) ->
  destino/rota do `NavHost` (mirror do `NotificationsSheet`). Deep link por tipo reaproveitando os
  destinos que ja existem no grafo (feed, `profile/{username}`, `desafio`).

### FCM (`feature/notifications/` + wiring de app)
- Dependencias: Firebase BoM + `firebase-messaging`, plugin Gradle `google-services`,
  `google-services.json` em `android/app/` (fornecido pelo usuario; gitignored).
- `LajesFitMessagingService : FirebaseMessagingService`:
  - `onNewToken(token)`: registra/atualiza o token do dispositivo.
  - `onMessageReceived(msg)`: monta a **notificacao local** (canal + `POST_NOTIFICATIONS`) e o
    **deep link** ao tocar, abrindo a `MainActivity`/`NavHost` na rota certa.
- **Ciclo de vida do token**: upsert em `push_subscriptions` (`user_id`, `platform='android'`,
  `fcm_token`) na concessao de permissao/login; atualizar no `onNewToken`; **remover no logout**
  (para nao mandar push a quem saiu).
- **Android 13+ (API 33+)**: permissao em runtime `POST_NOTIFICATIONS`. **minSdk 26**: canal de
  notificacao sempre necessario.
- **Mensagem data-only**: o servidor manda os campos de roteamento (`type`, `board`,
  `podium_event_id`, `actor_username`, `title`, `body`) como `data`, sem bloco `notification:`, para
  o app controlar exibicao e deep link tambem em background/app fechado.

## Backend (web + Supabase)

- **Nova migration `supabase/migrations/20260722120000_fcm_push_support.sql`** (proxima apos
  `20260721120000_podium_events.sql`):
  - `CREATE TYPE push_platform AS ENUM ('web','android')`.
  - `ALTER TABLE push_subscriptions`: `ADD platform push_platform NOT NULL DEFAULT 'web'` (backfill
    correto - toda linha hoje e' web); relaxar `endpoint/p256dh/auth` para NULL; `ADD fcm_token TEXT
    UNIQUE`; `CHECK` garantindo que linha `web` tenha os 3 campos web e `android` tenha `fcm_token`.
  - RLS inalterada (`auth.uid() = user_id`, ja agnostica de plataforma).
- **`src/routes/api/push/send.ts`**: **estender, nao duplicar**. Query de `push_subscriptions` passa
  a trazer `platform`/`fcm_token`; branch por assinatura - `web` mantem `web-push` como esta,
  `android` usa `firebase-admin` (`getMessaging().send(...)`) com **data-only**. Poda de tokens
  mortos ganha os erros do FCM (`messaging/registration-token-not-registered` etc.), mesma logica do
  404/410 de hoje. Preserva o claim atomico via `pushed_at`.
- **`package.json` (web)**: nova dependencia `firebase-admin`. Env no Vercel: `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ou `FIREBASE_SERVICE_ACCOUNT_JSON`).

## Dependencias humanas (nenhum agente resolve - exigem suas contas)

- **Firebase Console**: criar/usar um projeto; **registrar o app Android sob `com.lajesfit.app`** -
  este e' o `applicationId` do app (o takeover da ficha da TWA), NAO `com.lajesfit.android` (que e'
  so o pacote Kotlin). O `google-services.json` casa pelo `applicationId`; se registrar sob o pacote
  errado, o FCM nao inicializa. Baixar o `google-services.json` para `android/app/`.
- **Service account** do Firebase para as env vars do Vercel.
- **Aplicar a migration** `20260722120000_fcm_push_support.sql` no Supabase.
- **Deploy do web** com o `send.ts` estendido + `firebase-admin`.

## Sub-partes de execucao (um marco = varias sessoes; nao empilhar)

- [ ] **M8.1 - Backend FCM (web/supabase)**: migration `fcm_push_support` + branch FCM no `send.ts`
  + `firebase-admin`. Verificavel na propria sessao (web): `tsc --noEmit`, eslint dos arquivos
  tocados, `npm run build`, migration validada. **Independe do Android** - pode rodar em paralelo.
- [ ] **M8.2 - Android: inbox de notificacoes**: repository/viewmodel/screen espelhando
  `notifications-api` + `NotificationsSheet`; sino na top bar; marcar todas como lidas; deep link
  por tipo. Postgrest puro, **sem FCM**. `@Preview` obrigatorio.
- [ ] **M8.3 - Android: FCM**: deps + plugin `google-services` + `LajesFitMessagingService`
  (`onNewToken`/`onMessageReceived`); upsert/delete do token em `push_subscriptions`;
  `POST_NOTIFICATIONS` + canal; deep link do push para o `NavHost`. **Depende** do
  `google-services.json` (usuario) e da migration M8.1 aplicada.

## Feito quando

- **Inbox**: abrir o sino lista as notificacoes reais do usuario, marca todas como lidas, e tocar
  numa leva a tela certa (feed / perfil / desafio), incluindo o deep link de podio.
- **Push**: uma acao (curtir / comentar / seguir / destronar / podio) feita num dispositivo gera
  **push real** no app Android de outro; tocar abre a tela certa **mesmo com o app fechado**;
  respeitando as preferencias por tipo (herdadas do M7).
- **Sem regressao**: o Web Push do PWA (`android-twa`/navegador) continua funcionando.

## Notas de execucao / riscos

- `applicationId com.lajesfit.app` <-> `google-services.json` **tem que casar**, senao o Firebase
  nao inicializa e nenhum push chega. (Ponto que o `PLANO.md`, escrito antes do takeover, ainda
  lista errado como `com.lajesfit.android`.)
- Nao portar o service worker web nem VAPID; no Android e' FCM puro.
- `read_at` vs `pushed_at` sao coisas diferentes: `read_at` = lida na inbox; `pushed_at` = push ja
  despachado (idempotencia). O M8 mexe em `read_at` (inbox) e le `pushed_at` so indiretamente.
- Verificacao real de push exige dois dispositivos/contas e o Firebase configurado - parte fica
  para device (fora do alcance de sessao sem device).
