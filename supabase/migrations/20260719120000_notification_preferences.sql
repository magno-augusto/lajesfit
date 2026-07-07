-- Preferencias de notificacao por tipo: curtidas, comentarios, novos
-- seguidores e atualizacoes no rank dos desafios. O notifications_enabled
-- continua como interruptor geral; cada trigger passa a checar tambem a
-- preferencia especifica do destinatario.

SET check_function_bodies = off;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_follows BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_challenges BOOLEAN NOT NULL DEFAULT true;

-- Curtidas
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
  v_enabled BOOLEAN;
BEGIN
  SELECT user_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT notifications_enabled AND notify_likes INTO v_enabled
  FROM public.profiles WHERE id = v_owner;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (v_owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Comentarios
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
  v_enabled BOOLEAN;
BEGIN
  SELECT user_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT notifications_enabled AND notify_comments INTO v_enabled
  FROM public.profiles WHERE id = v_owner;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (v_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Novos seguidores
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.following_id AND actor_id = NEW.follower_id AND type = 'follow'
  ) THEN RETURN NEW; END IF;

  SELECT notifications_enabled AND notify_follows INTO v_enabled
  FROM public.profiles WHERE id = NEW.following_id;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END;
$$;

-- Novato no rank do desafio: respeita a preferencia de desafios do destinatario
CREATE OR REPLACE FUNCTION public.notify_challenge_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_private BOOLEAN;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT is_private, created_at INTO v_is_private, v_created_at
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_is_private IS DISTINCT FROM false THEN RETURN NEW; END IF;
  IF v_created_at IS NULL OR v_created_at < now() - interval '30 days' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE actor_id = NEW.user_id AND type = 'challenge_join'
  ) THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, actor_id, type)
  SELECT p.id, NEW.user_id, 'challenge_join'
  FROM public.profiles p
  WHERE p.id <> NEW.user_id
    AND p.notifications_enabled
    AND p.notify_challenges;

  RETURN NEW;
END;
$$;

-- Coroa roubada: idem
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

  SELECT notifications_enabled AND notify_challenges INTO v_enabled
  FROM public.profiles WHERE id = v_old;
  IF v_enabled IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, board)
    VALUES (v_old, v_new, 'challenge_dethroned', p_board);
  END IF;
END;
$$;
