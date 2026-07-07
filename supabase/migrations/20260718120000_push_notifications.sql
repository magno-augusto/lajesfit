-- Notificacoes push: inscricoes por dispositivo, notificacao de novo
-- seguidor, notificacao de coroa roubada (perda do 1o lugar num desafio)
-- e webhook via pg_net que aciona o envio do push no servidor do app.

SET check_function_bodies = off;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'follow';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'challenge_dethroned';

-- board: qual ranking gerou a notificacao; pushed_at: idempotencia do envio push
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS board TEXT,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

-- Inscricoes web push (uma por dispositivo/navegador)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Novo seguidor: notifica quem foi seguido (uma vez por par seguidor/seguido,
-- para follow/unfollow em loop nao virar spam)
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.following_id AND actor_id = NEW.follower_id AND type = 'follow'
  ) THEN RETURN NEW; END IF;

  SELECT notifications_enabled INTO v_enabled FROM public.profiles WHERE id = NEW.following_id;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_follow_notify AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();

-- Lider atual de cada ranking no mes, para detectar quando alguem e' destronado
CREATE TABLE public.challenge_leaders (
  board TEXT NOT NULL,
  period_month DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board, period_month)
);
GRANT ALL ON public.challenge_leaders TO service_role;
ALTER TABLE public.challenge_leaders ENABLE ROW LEVEL SECURITY;
-- sem policies: somente as funcoes SECURITY DEFINER abaixo acessam a tabela

-- Top 2 de um ranking com o valor da metrica (para desempate ao destronar)
CREATE OR REPLACE FUNCTION public.board_top2(p_board TEXT)
RETURNS TABLE (user_id UUID, value NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_board = 'activities' THEN
    RETURN QUERY SELECT g.user_id, g.total_activities::numeric FROM public.get_activity_count_leaderboard(2) g;
  ELSIF p_board = 'workout_days' THEN
    RETURN QUERY SELECT g.user_id, g.active_days::numeric FROM public.get_workout_days_leaderboard(2) g;
  ELSIF p_board = 'distance' THEN
    RETURN QUERY SELECT g.user_id, g.total_distance_meters FROM public.get_distance_leaderboard(2) g;
  ELSIF p_board = 'calories' THEN
    RETURN QUERY SELECT g.user_id, g.total_calories FROM public.get_calories_leaderboard(2) g;
  ELSIF p_board = 'diet_days' THEN
    RETURN QUERY SELECT g.user_id, g.active_days::numeric FROM public.get_diet_days_leaderboard(2) g;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_board_leader(p_board TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_month DATE := date_trunc('month', now())::date;
  v_new UUID;
  v_new_value NUMERIC;
  v_old UUID;
  v_old_value NUMERIC;
  v_enabled BOOLEAN;
BEGIN
  SELECT t.user_id, t.value INTO v_new, v_new_value
  FROM public.board_top2(p_board) t LIMIT 1;
  IF v_new IS NULL THEN RETURN; END IF;

  SELECT l.user_id INTO v_old FROM public.challenge_leaders l
  WHERE l.board = p_board AND l.period_month = v_month;

  IF v_old IS NULL THEN
    INSERT INTO public.challenge_leaders (board, period_month, user_id)
    VALUES (p_board, v_month, v_new)
    ON CONFLICT (board, period_month) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = now();
    RETURN;
  END IF;

  IF v_old = v_new THEN RETURN; END IF;

  -- empate nao rouba a coroa: o novo lider precisa passar o antigo de fato
  SELECT t.value INTO v_old_value FROM public.board_top2(p_board) t WHERE t.user_id = v_old;
  IF v_old_value IS NOT NULL AND v_old_value >= v_new_value THEN RETURN; END IF;

  UPDATE public.challenge_leaders SET user_id = v_new, updated_at = now()
  WHERE board = p_board AND period_month = v_month;

  SELECT notifications_enabled INTO v_enabled FROM public.profiles WHERE id = v_old;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, board)
    VALUES (v_old, v_new, 'challenge_dethroned', p_board);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_workout_leaders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.update_board_leader('activities');
  PERFORM public.update_board_leader('workout_days');
  PERFORM public.update_board_leader('distance');
  PERFORM public.update_board_leader('calories');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_workout_refresh_leaders AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.refresh_workout_leaders();

CREATE OR REPLACE FUNCTION public.refresh_diet_leaders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.update_board_leader('diet_days');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_diet_entry_refresh_leaders AFTER INSERT ON public.diet_entries
  FOR EACH ROW EXECUTE FUNCTION public.refresh_diet_leaders();

-- Entrega do push: pg_net chama o endpoint do app, que busca a notificacao
-- pelo id e envia via Web Push (idempotente pelo pushed_at)
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.request_push_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type IN ('like', 'comment', 'follow', 'challenge_dethroned') THEN
    PERFORM net.http_post(
      url := 'https://lajesfit.vercel.app/api/push/send',
      body := jsonb_build_object('notificationId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_notification_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.request_push_delivery();
