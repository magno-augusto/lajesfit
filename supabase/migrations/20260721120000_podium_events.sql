-- Eventos de podio: quando o lider de um ranking mensal muda, registra um
-- evento (no maximo 1 por dia por ranking) com o snapshot do top 3 e notifica
-- os administradores, que compartilham a imagem do podio no grupo do WhatsApp.

SET check_function_bodies = off;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'challenge_podium';

CREATE TABLE public.podium_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board TEXT NOT NULL,
  period_month DATE NOT NULL,
  event_date DATE NOT NULL DEFAULT current_date,
  old_leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  new_leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  top3 JSONB NOT NULL,
  shared_at TIMESTAMPTZ,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board, event_date)
);
GRANT ALL ON public.podium_events TO service_role;
ALTER TABLE public.podium_events ENABLE ROW LEVEL SECURITY;
-- sem policies: acesso somente pelas funcoes SECURITY DEFINER abaixo

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS podium_event_id UUID REFERENCES public.podium_events(id) ON DELETE CASCADE;

-- Snapshot do top 3 de um ranking no momento da troca de lider (posicao no
-- array = colocacao; os RPCs de leaderboard ja excluem perfis privados)
CREATE OR REPLACE FUNCTION public.board_top3_snapshot(p_board TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_board = 'activities' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'username', g.username, 'display_name', g.display_name,
      'avatar_url', g.avatar_url, 'value', g.total_activities::numeric)) INTO v_result
    FROM public.get_activity_count_leaderboard(3) g;
  ELSIF p_board = 'workout_days' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'username', g.username, 'display_name', g.display_name,
      'avatar_url', g.avatar_url, 'value', g.active_days::numeric)) INTO v_result
    FROM public.get_workout_days_leaderboard(3) g;
  ELSIF p_board = 'distance' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'username', g.username, 'display_name', g.display_name,
      'avatar_url', g.avatar_url, 'value', g.total_distance_meters)) INTO v_result
    FROM public.get_distance_leaderboard(3) g;
  ELSIF p_board = 'calories' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'username', g.username, 'display_name', g.display_name,
      'avatar_url', g.avatar_url, 'value', g.total_calories)) INTO v_result
    FROM public.get_calories_leaderboard(3) g;
  ELSIF p_board = 'diet_days' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'username', g.username, 'display_name', g.display_name,
      'avatar_url', g.avatar_url, 'value', g.active_days::numeric)) INTO v_result
    FROM public.get_diet_days_leaderboard(3) g;
  END IF;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Redefinida a partir da versao de 20260719120000 (preserva notify_challenges):
-- alem de notificar o destronado, registra o evento de podio do dia e avisa
-- os admins na primeira troca de lider do dia (trocas seguintes caem no
-- ON CONFLICT e sao ignoradas)
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
  v_event_id UUID;
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

  INSERT INTO public.podium_events (board, period_month, old_leader_id, new_leader_id, top3)
  VALUES (p_board, v_month, v_old, v_new, public.board_top3_snapshot(p_board))
  ON CONFLICT (board, event_date) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    -- notificacao operacional de admin: nao filtra preferencias de proposito
    INSERT INTO public.notifications (user_id, actor_id, type, board, podium_event_id)
    SELECT p.id, v_new, 'challenge_podium', p_board, v_event_id
    FROM public.profiles p WHERE p.is_admin;
  END IF;

  SELECT notifications_enabled AND notify_challenges INTO v_enabled
  FROM public.profiles WHERE id = v_old;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, board)
    VALUES (v_old, v_new, 'challenge_dethroned', p_board);
  END IF;
END;
$$;

-- Redefinida a partir da versao de 20260718120000: inclui challenge_podium
-- no envio de push (challenge_join continua fora)
CREATE OR REPLACE FUNCTION public.request_push_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type IN ('like', 'comment', 'follow', 'challenge_dethroned', 'challenge_podium') THEN
    PERFORM net.http_post(
      url := 'https://lajesfit.vercel.app/api/push/send',
      body := jsonb_build_object('notificationId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Leitura/escrita dos eventos pelo admin (padrao admin_set_participant_weight)
CREATE OR REPLACE FUNCTION public.get_pending_podium_events()
RETURNS TABLE (id UUID, board TEXT, period_month DATE, event_date DATE, top3 JSONB, shared_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver eventos de podio';
  END IF;

  RETURN QUERY
  SELECT e.id, e.board, e.period_month, e.event_date, e.top3, e.shared_at, e.created_at
  FROM public.podium_events e
  WHERE e.shared_at IS NULL
    AND e.period_month = date_trunc('month', now())::date
  ORDER BY e.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_podium_events() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_podium_event(p_event_id UUID)
RETURNS TABLE (id UUID, board TEXT, period_month DATE, event_date DATE, top3 JSONB, shared_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver eventos de podio';
  END IF;

  RETURN QUERY
  SELECT e.id, e.board, e.period_month, e.event_date, e.top3, e.shared_at, e.created_at
  FROM public.podium_events e
  WHERE e.id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_podium_event(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_podium_event_shared(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem marcar eventos de podio';
  END IF;

  UPDATE public.podium_events
  SET shared_at = now(), shared_by = auth.uid()
  WHERE id = p_event_id AND shared_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_podium_event_shared(UUID) TO authenticated;
