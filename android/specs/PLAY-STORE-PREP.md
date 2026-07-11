# Preparo de publicacao na Play

Atualizado por: Codex em 2026-07-10.

Este documento consolida os itens que nao dependem de acesso ao Play Console para publicar o app
Android nativo do LajesFit. Ele foi escrito a partir do codigo atual do Android, da versao web/PWA
e das orientacoes oficiais consultadas em 2026-07-10:

- Data safety do Google Play:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Health Connect - get started:
  https://developer.android.com/health-and-fitness/health-connect/get-started

## URL de politica de privacidade

Rota web criada/atualizada: `src/routes/privacidade.tsx`.

URL esperada apos deploy do web: `https://lajesfit.vercel.app/privacidade`.

O texto cobre Android nativo e web/PWA:

- Conta: username, e-mail, senha gerenciada pelo Supabase Auth e Google Sign-In quando usado.
- Perfil/rede social: nome exibido, avatar, bio, privacidade, follows, likes, comentarios e posts.
- Dieta: refeicoes, alimentos, quantidades, macros, horarios e fotos de refeicoes.
- Treinos: tipo, titulo, data/hora, duracao, distancia, calorias e fotos opcionais.
- Health Connect no Android: leitura opcional de sessoes de exercicio, distancia e calorias.
- Strava somente no web/PWA: integracao opcional ainda existente no web, nao portada para Android.
- Camera/fotos/codigo de barras: scanner de alimento, fotos escolhidas pelo usuario e consulta ao
  Open Food Facts.

## Health Connect

Permissoes declaradas hoje em `app/src/main/AndroidManifest.xml`:

- `android.permission.health.READ_EXERCISE`
- `android.permission.health.READ_DISTANCE`
- `android.permission.health.READ_TOTAL_CALORIES_BURNED`

Uso real no codigo:

- `HealthConnectSync.kt` le `ExerciseSessionRecord` do mes atual.
- Para cada sessao, agrega `DistanceRecord.DISTANCE_TOTAL` e
  `TotalCaloriesBurnedRecord.ENERGY_TOTAL`.
- O app grava no Supabase apenas o treino importado: tipo, titulo, inicio, duracao, distancia,
  calorias e `health_connect_record_id`.
- O app cria/atualiza o post relacionado ao treino importado.
- Nao ha escrita de dados no Health Connect.
- Nao ha sync em background.
- Nao ha leitura de rota/localizacao, frequencia cardiaca, sono, peso, sinais vitais ou prontuario.
- O usuario pode revogar acesso no Health Connect/Android; o app volta para o estado de permissao
  ausente.

Texto-base para a declaracao do Play Console:

> O LajesFit usa Health Connect de forma opcional para importar sessoes de exercicio do mes atual
> autorizadas pelo usuario. Lemos sessoes de exercicio, distancia e calorias totais queimadas para
> preencher o historico de treinos, calcular resumos de dieta/atividade, criar o post do treino e
> atualizar rankings de desafios. Nao lemos dados medicos, rotas/localizacao, frequencia cardiaca,
> sono ou outros tipos de dados de saude. Nao escrevemos no Health Connect e nao usamos esses dados
> para anuncios, credito, seguro ou decisoes medicas.

Checklist tecnico de Health Connect:

- [x] Manifest declara as tres permissoes usadas.
- [x] Manifest declara `queries` para `com.google.android.apps.healthdata`.
- [x] Existe `HealthPermissionRationaleActivity` com
      `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`.
- [x] `activity-alias` para Android 14+ adicionado ao manifest (tarefa #9, Claude, 2026-07-11):
      `ViewPermissionUsageActivity` responde a `VIEW_PERMISSION_USAGE`/`HEALTH_PERMISSIONS`, protegido
      por `android.permission.START_VIEW_PERMISSION_USAGE`, apontando (`targetActivity`) para a
      `HealthPermissionRationaleActivity` que ja existia. Reusa a mesma tela de rationale/uso de dados.
- [ ] Validar sync real em aparelho/emulador Android 9+; o device atual Android 8.1 retorna Health
      Connect indisponivel, que e esperado.

## Data safety - inventario recomendado

No formulario, "coletar" inclui dados transmitidos para fora do aparelho. O app transmite dados ao
Supabase, e a consulta por codigo de barras transmite o codigo ao Open Food Facts. Se Supabase for
declarado como prestador de servico/processador em nome do app, tende a nao ser "compartilhamento"
para fins de Data safety; confirme no Play Console com a politica vigente da conta.

### Dados pessoais

- E-mail: coletado para autenticacao, recuperacao de senha e gerenciamento de conta.
- User IDs / username / Supabase user id: coletados para conta, perfil, posts, follows e RLS.
- Nome exibido e bio: coletados para perfil e exibicao social.

Finalidades: funcionalidade do app, gerenciamento de conta, seguranca/autenticacao.

### Saude e fitness

- Fitness info: treinos manuais e importados do Health Connect/Strava, incluindo tipo de atividade,
  duracao, distancia, calorias e horarios.
- Health info: nao declarar salvo se o Console classificar calorias/treinos como Health info alem de
  Fitness info. O codigo nao coleta prontuario, sintomas, sono, sinais vitais ou dados medicos.

Finalidades: funcionalidade do app, analise/resumo do usuario, rankings/desafios.

### Fotos e videos

- Fotos: avatar, foto de refeicao e foto de treino escolhidas pelo usuario.
- Videos: o Android nativo nao faz upload de video hoje; o feed apenas pode exibir URLs existentes.

Finalidades: funcionalidade do app e compartilhamento social conforme acao do usuario.

### Conteudo gerado pelo usuario

- Posts, comentarios, likes, follows, pedidos de follow, refeicoes e treinos.
- Preferencias de perfil privado e preferencias de notificacao.

Finalidades: funcionalidade do app, rede social, notificacoes e gerenciamento de conta.

### App activity

- App interactions: declarar somente se a Play considerar curtidas, comentarios, follows e posts
  como interacoes do app alem de conteudo gerado pelo usuario.
- Search history: o app faz busca de pessoas/alimentos, mas nao ha persistencia explicita de
  historico de busca no codigo Android.

### Device or other IDs

- Supabase Auth usa identificadores de usuario e tokens de sessao.
- Nao ha Advertising ID no Android nativo atual.
- Nao ha Firebase/FCM no app Android atual; M8 ainda nao foi implementado.

### Location

- Nao declarar localizacao para o Android nativo atual.
- Health Connect nao le rotas de exercicio.

### Camera

Permissao atual: `android.permission.CAMERA`.

Uso: scanner de codigo de barras de alimento com CameraX/ML Kit. As imagens da camera do scanner
ficam no processamento local do ML Kit; o app envia ao Open Food Facts apenas o codigo de barras
detectado ou digitado. Fotos de refeicao/treino/avatar sao escolhidas via seletor de arquivo/foto,
nao pela permissao de camera.

## Declaracoes de seguranca

Respostas-base para o formulario:

- Criptografia em transito: sim. Supabase, Open Food Facts, Google Sign-In, Strava/web e endpoints
  web usam HTTPS.
- Mecanismo de exclusao: sim. A politica publica informa contato por
  `magnoaugustoss@gmail.com` e prazo de ate 15 dias. O app tambem permite remover alguns conteudos
  proprios (posts, comentarios, refeicoes/treinos conforme tela).
- Dados opcionais: Health Connect, Strava/web, fotos e posts/comentarios sao acionados pelo usuario.
- Compartilhamento para publicidade: nao.
- Venda de dados: nao.
- Uso de dados Health Connect para anuncios, credito, seguro ou decisoes medicas: nao.

## Itens pendentes antes de enviar o AAB

- [x] Web deployado com `/privacidade` publica — confirmado em 2026-07-11 que
      `https://lajesfit.vercel.app/privacidade` abre sem login, com politica completa (coleta,
      Health Connect, Supabase, exclusao de conta).
- [x] `versionCode = 2` confirmado no Play Console (a TWA tinha `versionCode 1`, so no teste
      interno) — 2026-07-11.
- [x] Assinatura confirmada: SHA-256 do cert do AAB == keystore de upload (alias `lajesfit`,
      `0A:86:47:...:97:D0:6C`) — 2026-07-11.
- [x] AAB release gerado e assinado (`:app:bundleRelease`, 29 MB, `versionCode 2`). Teste em device
      fisico ainda recomendado (nao bloqueia o teste interno).
- [x] Takeover confirmado: `com.lajesfit.app` v2 nativa **publicada no teste interno** em
      2026-07-11 03:19 ("Disponivel para testadores internos", substituindo a v1 da TWA). Status da
      release: "Nao revisado" (revisao do Google em andamento).
- [x] Migrations `20260720120000_health_connect_workouts.sql` e `20260721120000_podium_events.sql`
      **ja aplicadas no remoto** — confirmado via `supabase migration list` em 2026-07-11 (ambas com
      `remote` correspondente; nenhuma pendente).
- [ ] Validar Health Connect em Android 9+ e dedupe de importacao (pendente — precisa device).
- [x] Data safety, Apps de saude e ID de publicidade preenchidos/revisados no Console (2026-07-11):
      ID de publicidade = "Nao" (sem `AD_ID` no manifest merged do release); Data safety herdado da
      TWA revisado e **correto para o nativo** (Nome/E-mail/IDs de usuario; fitness cobre Health
      Connect; fotos; interacoes no app; sem localizacao/financeiro/AD_ID); Apps de saude = so
      "Atividade e condicionamento fisicos".

## Status do primeiro publish (2026-07-11)

Primeiro publish do app nativo **feito** na trilha de **teste interno** (`com.lajesfit.app`,
`versionCode 2`, `0.1.0`). Passos 1-8 da lista de publicacao concluidos. Pendencias que sobram, todas
do usuario/device:

- **Promover para producao** quando validado (Play Console: "Promover versao" teste interno ->
  producao; revisao mais criteriosa, reusa os formularios ja preenchidos).
- **Testar a v2 em device** Android 8.0+ via link de opt-in do teste interno (aba "Testadores").
- **Validar Health Connect** em Android 9+ (o J7 Prime do dev nao roda HC).
- Opcional em versao futura: habilitar R8/proguard e subir simbolos de depuracao nativos (avisos
  benignos vistos na tela de review; nenhum bloqueia).

## Fora do escopo desta tarefa

- Edicoes em `android/app/**`, incluindo `app/build.gradle.kts`, manifest, icones e build release.
- Acesso ao Play Console.
- Aplicar migrations no Supabase.
- Validacao real de Health Connect em device compativel.
