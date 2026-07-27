# Stack e arquitetura

## Stack

- **Web:** React + TypeScript, Vite, TanStack Start, Supabase, Tailwind, deploy na
  Vercel (`lajesfit.vercel.app`).
- **Android:** Kotlin + Jetpack Compose, supabase-kt. Ja em teste interno na Play
  Store (`com.lajesfit.app`).

## Por que app nativo Android e o produto principal (nao so PWA)

- **Strava (risco):** a API limita as contas que podem vincular (bateu em ~10) e
  endureceu os termos para apps sociais que exibem dados de outros atletas.
  Depender do Strava e arriscado -> por isso a pivotada para Health Connect (API
  nativa do Android; nao existe para web/PWA -- este e o motivo FUNCIONAL do app
  nativo).
- **WebAPK:** PWA instalado no Android moderno vira app real (icone, tela cheia).
  Exige Chrome atual + Google Play Services. O aparelho de teste do Magno (Samsung
  J7 Prime antigo) cai para um "atalho" inferior e nao roda Health Connect -- nao
  usar como referencia de experiencia.

## Deploy (Vercel)

- `.vercelignore` na raiz exclui `android/` e `android-twa/` -- sem isso, os ~40
  mil arquivos de cache do Gradle (`android/.gradle-user-home`) travavam o
  empacotamento do deploy.
