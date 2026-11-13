import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Klientas su service_role raktu: apeina RLS. Naudoti TIK serveryje (webhook'ai, fono užduotys)
 * ir tik po to, kai atskirai patikrinta, kas ir ką daro. Niekada neimportuokite į "use client" failus.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("Trūksta SUPABASE_SERVICE_ROLE_KEY arba NEXT_PUBLIC_SUPABASE_URL.");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
