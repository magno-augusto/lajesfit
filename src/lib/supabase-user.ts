import { supabase } from "@/integrations/supabase/client";

export async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessao expirada. Entre novamente.");
  return data.user.id;
}
