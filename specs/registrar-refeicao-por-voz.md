# Registrar refeicao por voz

**Status:** feito e em producao (web + Android).

## O que faz

Usuario grava audio descrevendo o que comeu -> transcrito -> IA extrai os
alimentos com nutrientes -> preenche os itens da refeicao automaticamente.

## Arquitetura

Rotas web (`src/routes/api/transcribe.ts`, `src/routes/api/parse-meal.ts`) usadas
como backend compartilhado pelo Android (nao ha logica de IA duplicada no app
nativo):

- **Transcricao:** Groq Whisper (`whisper-large-v3-turbo`), pt-BR.
- **Interpretacao:** Google Gemini, alias `gemini-flash-latest` (sempre a versao
  estavel mais recente -- NAO fixar em `gemini-2.5-flash` ou similar: a Google ja
  descontinuou esse modelo para chaves de API novas sem aviso previo).
- Ambas as chaves sao free tier, configuradas nas env vars de producao da Vercel
  (`GROQ_API_KEY`, `GOOGLE_GEMINI_API_KEY`).

## Riscos conhecidos / pendencias

- **As rotas nao tem autenticacao nem rate limit.** Qualquer pessoa que descobrir
  a URL pode gerar custo nas chaves Groq/Gemini. Resolver antes de divulgar ou
  crescer a base de usuarios.

## Licoes tecnicas (Android) encontradas nesta implementacao

Bugs que provavelmente se repetem em codigo novo -- vale checar sempre:

- `Instant.parse` no Kotlin rejeita o formato de timestamp que o
  PostgREST/Supabase retorna (offset explicito `+00:00`; so aceita sufixo `Z`).
  Usar `OffsetDateTime.parse(...).atZoneSameInstant(...)` em vez de
  `Instant.parse`. Corrigido em: `DietViewModel`, `WorkoutsViewModel`,
  `AddWorkoutViewModel`, `WorkoutsScreen`, `FeedFormat`.
- `throw Error(...)` em Kotlin NAO e capturado por `catch (e: Exception)` (sao
  tipos irmaos sob `Throwable`, nao pai/filho) -- o app crashava direto em vez de
  mostrar mensagem de erro. Usar `Exception`/`RuntimeException`.
- `MediaRecorder.OutputFormat.WEBM` so existe a partir da API 30 (Android 11) --
  usar `MPEG_4`/`AAC` para funcionar desde a API 26 (`minSdk` do projeto).
- Permissoes perigosas (ex.: `RECORD_AUDIO`) precisam ser pedidas em runtime, nao
  so declaradas no manifest -- seguir o padrao ja usado para `CAMERA` em
  `BarcodeScannerScreen.kt` (`rememberLauncherForActivityResult`).
- O `HttpClient` (Ktor) compartilhado nao tinha timeout configurado (default do
  engine OkHttp ~10s) -- curto demais para uma chamada de IA com "thinking".
  Configurado para 60s via plugin `HttpTimeout`.
