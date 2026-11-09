import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "worker";

export type SessionContext = {
  userId: string;
  email: string;
  fullName: string | null;
  company: { id: string; name: string; trialEndsAt: string; complimentary: boolean } | null;
  role: Role | null;
  /** Serverio pusėje patikrinta prieiga: bandymas, prenumerata arba nemokama prieiga. */
  hasAccess: boolean;
  /** Aktyvi/bandomoji prenumerata (matoma tik administratoriams). */
  subscribed: boolean;
};

async function loadMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("company_members")
    .select("role, company:companies(id, name, trial_ends_at, complimentary)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

type Membership = Awaited<ReturnType<typeof loadMembership>>;
const unwrapCompany = (membership: Membership) => {
  const raw = membership?.company as unknown;
  return (Array.isArray(raw) ? raw[0] : raw) as
    | { id: string; name: string; trial_ends_at: string; complimentary: boolean }
    | null
    | undefined;
};

export const getContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  // Profilis ir narystė nepriklauso vienas nuo kito – kraunami kartu.
  const [{ data: profile }, firstMembership] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    loadMembership(supabase, user.id),
  ]);

  let membership = firstMembership;
  if (!membership) {
    // Gal būti laukiančių pakvietimų šiam (patvirtintam) el. paštui.
    const { data: claimed } = await supabase.rpc("claim_invitations");
    if (claimed) membership = await loadMembership(supabase, user.id);
  }
  const c = unwrapCompany(membership);

  let hasAccess = false;
  let subscribed = false;
  if (c) {
    const [access, sub] = await Promise.all([
      supabase.rpc("company_has_access", { cid: c.id }),
      supabase.from("subscriptions").select("status").eq("company_id", c.id).maybeSingle(),
    ]);
    hasAccess = access.data === true;
    const st = sub.data?.status;
    subscribed = st === "active" || st === "trialing" || st === "past_due";
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    company: c ? { id: c.id, name: c.name, trialEndsAt: c.trial_ends_at, complimentary: c.complimentary } : null,
    role: (membership?.role as Role | undefined) ?? null,
    hasAccess,
    subscribed,
  };
});

/**
 * Lengvas kontekstas veiksmams (server actions): tik naudotojas, įmonė ir vaidmuo (2 užklausos vietoj 5).
 * Prieigos (bandymo/prenumeratos) taisyklę vis tiek užtikrina RLS (`company_has_access`) kiekvienam rašymui.
 */
export const getActionContext = cache(async (): Promise<{ userId: string; companyId: string | null; role: Role | null } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const membership = await loadMembership(supabase, data.user.id);
  const c = unwrapCompany(membership);
  return { userId: data.user.id, companyId: c?.id ?? null, role: (membership?.role as Role | undefined) ?? null };
});

export async function requireContext(): Promise<SessionContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/prisijungimas");
  return ctx;
}

export const isAdmin = (role: Role | null) => role === "owner" || role === "admin";
