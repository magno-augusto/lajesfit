-- Rankings mensais de "dias ativos": contagem total de dias distintos com
-- treino/refeicao registrados no mes atual. Nao e sequencia (streak) -- nao
-- quebra/zera se a pessoa pular um dia sem registrar.

CREATE OR REPLACE FUNCTION public.get_workout_days_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, active_days INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.username, p.display_name, p.avatar_url,
         COUNT(DISTINCT w.performed_at::date)::int AS active_days
  FROM public.workouts w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.performed_at >= date_trunc('month', now())
    AND w.performed_at < date_trunc('month', now()) + interval '1 month'
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY active_days DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_workout_days_leaderboard(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_diet_days_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, active_days INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT d.user_id, p.username, p.display_name, p.avatar_url,
         COUNT(DISTINCT d.consumed_at::date)::int AS active_days
  FROM public.diet_entries d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.consumed_at >= date_trunc('month', now())
    AND d.consumed_at < date_trunc('month', now()) + interval '1 month'
  GROUP BY d.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY active_days DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_diet_days_leaderboard(INT) TO authenticated;
