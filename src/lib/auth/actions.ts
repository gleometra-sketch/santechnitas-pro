"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { companySchema, emailSchema, firstError, nameSchema, passwordSchema, safeNext } from "./validation";

export type FormState = { error?: string; message?: string } | undefined;

async function appOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function loginError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Neteisingas el. paštas arba slaptažodis.";
  if (m.includes("not confirmed")) return "El. paštas dar nepatvirtintas. Atidarykite laišką, kurį gavote po registracijos.";
  if (m.includes("rate limit") || m.includes("too many")) return "Per daug bandymų. Palaukite kelias minutes ir bandykite dar kartą.";
  return "Nepavyko prisijungti. Bandykite dar kartą.";
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success) return { error: firstError(email.error) };
  if (!password) return { error: "Įveskite slaptažodį" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return { error: loginError(error.message) };

  await supabase.rpc("claim_invitations"); // priima laukiančius pakvietimus
  redirect(safeNext(formData.get("next")) ?? "/darbai");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const name = nameSchema.safeParse(formData.get("fullName"));
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!name.success) return { error: firstError(name.error) };
  if (!email.success) return { error: firstError(email.error) };
  if (!password.success) return { error: firstError(password.error) };
  if (formData.get("consent") !== "on") return { error: "Pažymėkite, kad susipažinote su privatumo politika" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { data: { full_name: name.data }, emailRedirectTo: `${await appOrigin()}/auth/callback` },
  });
  if (error) {
    if (error.message.toLowerCase().includes("rate limit")) return { error: "Per daug bandymų. Palaukite kelias minutes." };
    return { error: "Nepavyko užregistruoti. Bandykite dar kartą." };
  }
  if (data.session) redirect("/darbai"); // jei el. pašto patvirtinimas išjungtas
  // Vienodas atsakymas nepriklausomai nuo to, ar el. paštas jau naudotas.
  return { message: "Išsiuntėme patvirtinimo laišką. Atidarykite jį ir paspauskite nuorodą, tada prisijunkite." };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: firstError(email.error) };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await appOrigin()}/auth/callback?next=/naujas-slaptazodis`,
  });
  return { message: "Jei toks el. paštas užregistruotas, išsiuntėme slaptažodžio atkūrimo nuorodą." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: firstError(password.error) };
  if (password.data !== String(formData.get("confirm") ?? "")) return { error: "Slaptažodžiai nesutampa" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Nepavyko pakeisti slaptažodžio. Atidarykite atkūrimo nuorodą iš laiško dar kartą." };
  redirect("/darbai");
}

export async function createCompany(_: FormState, formData: FormData): Promise<FormState> {
  const name = companySchema.safeParse(formData.get("name"));
  if (!name.success) return { error: firstError(name.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_company", { p_name: name.data });
  if (error) return { error: "Nepavyko sukurti įmonės. Bandykite dar kartą." };
  redirect("/darbai");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prisijungimas");
}
