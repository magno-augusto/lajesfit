import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LocalAuthSession = Session;

function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@lajesfit.local`;
}

export async function signUpWithPassword(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const cleanPassword = password.trim();

  if (!normalizedUsername || !cleanPassword) {
    throw new Error("Informe usuario e senha para criar sua conta");
  }

  if (cleanPassword.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres");
  }

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(normalizedUsername),
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

export async function loginWithPassword(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const cleanPassword = password.trim();

  if (!normalizedUsername || !cleanPassword) {
    throw new Error("Informe usuario e senha para entrar");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(normalizedUsername),
    password: cleanPassword,
  });

  if (error) throw new Error("Usuario ou senha incorretos");
  return data;
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
