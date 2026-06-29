-- Resolve o e-mail real da conta a partir do username, para permitir login por
-- username mesmo com contas usando e-mails diferentes (sintetico legado vs real).
CREATE OR REPLACE FUNCTION public.get_login_email(p_username TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.username = regexp_replace(lower(trim(p_username)), '[^a-z0-9_]', '', 'g')
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_login_email(TEXT) TO anon, authenticated;
