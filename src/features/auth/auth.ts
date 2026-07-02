import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LocalAuthSession = Session;

export const LEGACY_EMAIL_DOMAIN = "@lajesfit.local";

function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function describeEmailUpdateError(error: { code?: string; message: string }) {
  if (error.code === "email_exists" || /already.*registered|already.*use/i.test(error.message)) {
    return "Esse e-mail ja esta em uso por outra conta. Se for sua (ex: criada com login do Google), entre com ela em vez de cadastrar o e-mail aqui.";
  }
  return error.message;
}

export async function signUpWithPassword(username: string, password: string, email: string) {
  const normalizedUsername = normalizeUsername(username);
  const cleanPassword = password.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!normalizedUsername || !cleanPassword || !cleanEmail) {
    throw new Error("Informe usuario, e-mail e senha para criar sua conta");
  }

  if (!isValidEmail(cleanEmail)) {
    throw new Error("Informe um e-mail valido");
  }

  if (cleanPassword.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres");
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        username: normalizedUsername,
        display_name: normalizedUsername,
      },
    },
  });

  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  return data;
}

export async function loginWithPassword(identifier: string, password: string) {
  const cleanIdentifier = identifier.trim();
  const cleanPassword = password.trim();

  if (!cleanIdentifier || !cleanPassword) {
    throw new Error("Informe usuario ou e-mail e senha para entrar");
  }

  let email: string;
  if (isValidEmail(cleanIdentifier)) {
    email = cleanIdentifier.toLowerCase();
  } else {
    const normalizedUsername = normalizeUsername(cleanIdentifier);
    const { data: lookedUpEmail, error: lookupError } = await supabase.rpc("get_login_email", {
      p_username: normalizedUsername,
    });
    if (lookupError || !lookedUpEmail) throw new Error("Usuario ou senha incorretos");
    email = lookedUpEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: cleanPassword,
  });

  if (error) throw new Error("Usuario ou senha incorretos");
  return data;
}

export async function requestPasswordReset(username: string) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) throw new Error("Informe seu usuario");

  const { data: email, error: lookupError } = await supabase.rpc("get_login_email", {
    p_username: normalizedUsername,
  });
  if (lookupError || !email) {
    throw new Error("Nao encontramos uma conta com esse usuario");
  }

  if (typeof window === "undefined") {
    throw new Error("Recuperacao de senha indisponivel neste ambiente");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw new Error(error.message);
}

export async function confirmNewPassword(newPassword: string) {
  const cleanPassword = newPassword.trim();
  if (cleanPassword.length < 6) {
    throw new Error("A nova senha precisa ter pelo menos 6 caracteres");
  }

  const { error } = await supabase.auth.updateUser({ password: cleanPassword });
  if (error) throw new Error(error.message);
}

export async function loginWithGoogle() {
  if (typeof window === "undefined") {
    throw new Error("Login com Google indisponivel neste ambiente");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth`,
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

// Contas criadas via OAuth (ex: Google) nao possuem senha; a deteccao e' pela
// ausencia da identidade "email" no usuario.
export function hasPasswordLogin(user: User | null): boolean {
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  return providers.includes("email");
}

export async function setPassword(newPassword: string) {
  const cleanPassword = newPassword.trim();
  if (cleanPassword.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres");
  }

  const { error } = await supabase.auth.updateUser({ password: cleanPassword });
  if (error) throw new Error(error.message);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const cleanNewPassword = newPassword.trim();
  if (cleanNewPassword.length < 6) {
    throw new Error("A nova senha precisa ter pelo menos 6 caracteres");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) throw new Error("Sessao expirada. Entre novamente.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error("Senha atual incorreta");

  const { error } = await supabase.auth.updateUser({ password: cleanNewPassword });
  if (error) throw new Error(error.message);
}

export function useLocalAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
