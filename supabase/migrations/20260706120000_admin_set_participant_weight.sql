-- O peso dos participantes do desafio agora e inserido pelo administrador, nao
-- pelo proprio usuario. Como a RLS de challenge_participants so libera
-- INSERT/UPDATE da propria linha (auth.uid() = user_id), o admin precisa de
-- uma function SECURITY DEFINER para definir o peso de qualquer participante.
CREATE OR REPLACE FUNCTION public.admin_set_participant_weight(
  p_challenge_id UUID,
  p_user_id UUID,
  p_start_weight_kg NUMERIC,
  p_end_weight_kg NUMERIC DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem definir o peso de participantes';
  END IF;

  INSERT INTO public.challenge_participants (challenge_id, user_id, start_weight_kg, end_weight_kg)
  VALUES (p_challenge_id, p_user_id, p_start_weight_kg, p_end_weight_kg)
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET start_weight_kg = EXCLUDED.start_weight_kg, end_weight_kg = EXCLUDED.end_weight_kg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_participant_weight(UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
