# M5 - Revisao da sub-parte 3: Health Connect base

Status: **implementado em 2026-07-09**.

Este arquivo detalha a proxima sub-parte de M5: preparar o app para Health Connect sem ainda
importar sessoes para o Supabase. A importacao real fica para a sub-parte 4.

## Fontes verificadas

- Android Developers - Get started with Health Connect:
  https://developer.android.com/health-and-fitness/health-connect/get-started
- Android Developers - `ExerciseSessionRecord`:
  https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord

## Escopo desta sub-parte

- Adicionar dependencia `androidx.health.connect:connect-client`.
- Declarar permissoes Health Connect no `AndroidManifest.xml`.
- Declarar `<queries>` para `com.google.android.apps.healthdata`, necessario para checar
  disponibilidade em Android 13 e abaixo.
- Criar `HealthPermissionRationaleActivity`, Activity real fora do `NavHost`.
- Declarar a Activity com:
  - `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`;
  - `android.intent.action.VIEW_PERMISSION_USAGE` via `activity-alias`, se a API/build permitir
    sem quebrar compatibilidade.
- Criar camada `HealthConnectSync.kt` para:
  - checar `HealthConnectClient.getSdkStatus(context)`;
  - expor estado `unavailable`, `needsInstallOrUpdate`, `needsPermission`, `ready`;
  - montar o set inicial de permissoes;
  - checar permissoes concedidas via `permissionController.getGrantedPermissions()`.
- Atualizar `WorkoutsScreen` com card/CTA de Health Connect:
  - indisponivel: explicar que Health Connect nao esta disponivel no aparelho;
  - precisa instalar/atualizar: botao para abrir Play Store;
  - sem permissao: botao para pedir permissao;
  - pronto: mostrar "Pronto para sincronizar" e deixar o botao de sincronizacao para sub-parte 4.

## Permissoes iniciais

Para a base, pedir somente o minimo necessario para sessoes de exercicio:

- `HealthPermission.getReadPermission(ExerciseSessionRecord::class)`

Distancia/calorias por agregacao podem exigir permissoes adicionais. Se a sub-parte 4 confirmar que
a API exige tipos separados para ler distancia/calorias agregadas, adicionar essas permissoes no
mesmo ponto antes de implementar importacao.

## Fora do escopo

- Ler `ExerciseSessionRecord`.
- Agregar distancia/calorias.
- Gravar em `workouts`.
- Criar posts no feed para sessoes importadas.
- Migration `health_connect_record_id` em `../supabase`.
- `WorkManager`/sync automatico.

## Feito quando

- [x] O app compila com a dependencia Health Connect.
- [x] O manifest contem permissoes, `queries` e rationale Activity.
- [x] A tela de rationale abre como Activity independente e explica o uso dos dados.
- [x] A tela Treinos mostra um estado claro para Health Connect.
- [x] O botao de permissao abre a tela de permissoes do Health Connect quando a API esta disponivel.
- [ ] Build e `installDebug` passam no device.
- [ ] Abrir o app no device nao gera `FATAL AndroidRuntime` no logcat.
