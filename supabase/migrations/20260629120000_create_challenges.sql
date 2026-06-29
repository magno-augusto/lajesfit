-- CHALLENGES (desafio oficial mensal de perda de peso)
CREATE TYPE public.challenge_status AS ENUM ('active', 'closed');

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status public.challenge_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end)
);
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges viewable by authenticated" ON public.challenges FOR SELECT TO authenticated USING (true);

-- CHALLENGE PARTICIPANTS (peso e' privado: RLS so libera a propria linha)
CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_weight_kg NUMERIC NOT NULL CHECK (start_weight_kg > 0),
  end_weight_kg NUMERIC CHECK (end_weight_kg > 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);
GRANT SELECT, INSERT, UPDATE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own participation" ON public.challenge_participants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users join challenge" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON public.challenge_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Calcula o ranking apenas com o percentual perdido, nunca o peso em kg
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(p_challenge_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  pct_loss NUMERIC,
  rank INT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    cp.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    round(((cp.start_weight_kg - cp.end_weight_kg) / cp.start_weight_kg) * 100, 2) AS pct_loss,
    rank() OVER (ORDER BY (cp.start_weight_kg - cp.end_weight_kg) / cp.start_weight_kg DESC)::int AS rank
  FROM public.challenge_participants cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id AND cp.end_weight_kg IS NOT NULL
  ORDER BY pct_loss DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard(UUID) TO authenticated;

-- Garante o desafio do mes atual, fecha desafios vencidos e rola participantes
-- (sem infra de cron no projeto: chamada de forma lazy quando o usuario abre a pagina de desafios)
CREATE OR REPLACE FUNCTION public.ensure_challenge_lifecycle()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_id UUID;
  v_period_start DATE := date_trunc('month', now())::date;
  v_period_end DATE := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  v_closed RECORD;
BEGIN
  UPDATE public.challenges SET status = 'closed'
  WHERE status = 'active' AND period_end < current_date;

  INSERT INTO public.challenges (period_start, period_end)
  VALUES (v_period_start, v_period_end)
  ON CONFLICT (period_start, period_end) DO NOTHING;

  SELECT id INTO v_current_id FROM public.challenges
  WHERE period_start = v_period_start AND period_end = v_period_end;

  FOR v_closed IN
    SELECT cp.user_id, COALESCE(cp.end_weight_kg, cp.start_weight_kg) AS carry_weight
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE c.status = 'closed' AND c.period_end = (v_period_start - interval '1 day')::date
  LOOP
    INSERT INTO public.challenge_participants (challenge_id, user_id, start_weight_kg)
    VALUES (v_current_id, v_closed.user_id, v_closed.carry_weight)
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_current_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_challenge_lifecycle() TO authenticated;
