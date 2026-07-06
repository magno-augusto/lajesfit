-- Notifica todos os usuarios quando um novato entra no rank dos desafios:
-- conta criada ha ate 30 dias que registra o primeiro treino ou refeicao
-- (e' isso que coloca a pessoa nos rankings do mes). Dispara uma unica vez
-- por usuario, respeitando notifications_enabled e perfis privados.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'challenge_join';

CREATE OR REPLACE FUNCTION public.notify_challenge_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_private BOOLEAN;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- perfis privados nao aparecem nos rankings publicos: nao ha o que anunciar
  SELECT is_private, created_at INTO v_is_private, v_created_at
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_is_private IS DISTINCT FROM false THEN RETURN NEW; END IF;
  IF v_created_at IS NULL OR v_created_at < now() - interval '30 days' THEN RETURN NEW; END IF;

  -- uma unica celebracao por usuario; tambem protege contra importacoes em
  -- lote do Strava, que inserem varios treinos na mesma transacao
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE actor_id = NEW.user_id AND type = 'challenge_join'
  ) THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, actor_id, type)
  SELECT p.id, NEW.user_id, 'challenge_join'
  FROM public.profiles p
  WHERE p.id <> NEW.user_id
    AND p.notifications_enabled;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workout_challenge_join_notify AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.notify_challenge_join();

CREATE TRIGGER on_diet_entry_challenge_join_notify AFTER INSERT ON public.diet_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_challenge_join();
