import { createClient } from "@supabase/supabase-js";

/** Tik serveriui! service_role aplenkia RLS. Niekada nenaudokite komponentuose su "use client". */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
