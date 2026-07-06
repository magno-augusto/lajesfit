-- Desafio de atividades: quem registrou mais treinos no mes corrente.
-- Mesmo padrao dos demais rankings mensais (SECURITY DEFINER, exclui
-- perfis privados, leitura liberada para anon na pagina publica).
CREATE OR REPLACE FUNCTION public.get_activity_count_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, total_activities INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.username, p.display_name, p.avatar_url,
         COUNT(*)::int AS total_activities
  FROM public.workouts w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.performed_at >= date_trunc('month', now())
    AND w.performed_at < date_trunc('month', now()) + interval '1 month'
    AND NOT p.is_private
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY total_activities DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_activity_count_leaderboard(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_count_leaderboard(INT) TO anon;
