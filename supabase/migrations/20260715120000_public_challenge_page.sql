-- Pagina de desafios publica: visitantes (role anon) podem ver os rankings
-- do mes sem conta. Somente leitura agregada via RPCs SECURITY DEFINER;
-- pesos em kg e demais dados privados continuam inacessiveis.

GRANT SELECT ON public.challenges TO anon;
CREATE POLICY "Challenges viewable by anon" ON public.challenges FOR SELECT TO anon USING (true);

GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_workout_days_leaderboard(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_diet_days_leaderboard(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_distance_leaderboard(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_calories_leaderboard(INT) TO anon;

-- Perfis privados saem tambem do ranking de peso, como ja acontece nos
-- rankings de atividade (20260711120000_hide_private_profiles_feed_leaderboards)
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
  WHERE cp.challenge_id = p_challenge_id
    AND cp.end_weight_kg IS NOT NULL
    AND NOT p.is_private
  ORDER BY pct_loss DESC;
$$;
