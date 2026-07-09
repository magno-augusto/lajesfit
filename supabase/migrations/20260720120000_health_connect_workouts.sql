-- Health Connect (M5 sub-parte 4): dedupe de sessoes importadas em workouts.
-- workouts.source ja e TEXT desde 20260619113000_add_strava_import_support.sql; o enum
-- antigo public.workout_source (20260612021259_*.sql) ficou orfao apos o reset em
-- 20260618002450_*.sql e nao e usado por nenhuma coluna hoje, entao nao ha valor a adicionar nele.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS health_connect_record_id TEXT;

-- Mesma estrategia do indice de dedupe do Strava (workouts_user_strava_activity_idx): indice
-- unico NAO parcial, ja que valores NULL nao colidem entre si no Postgres - treinos manuais
-- (health_connect_record_id NULL) continuam livres de conflito. Um indice parcial (WHERE
-- health_connect_record_id IS NOT NULL) nao seria elegivel como arbitro do upsert via PostgREST,
-- que gera "ON CONFLICT (colunas)" sem predicado.
CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_health_connect_record_idx
  ON public.workouts(user_id, health_connect_record_id);

NOTIFY pgrst, 'reload schema';
