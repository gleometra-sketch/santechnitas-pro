"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCompany, requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/auth/actions";
import { Field, FormMessage, SubmitButton } from "./FormParts";

const link = "font-semibold text-accent-dark underline underline-offset-2";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field name="email" label="El. paštas" type="email" autoComplete="email" />
      <Field name="password" label="Slaptažodis" type="password" autoComplete="current-password" />
      <FormMessage state={state} />
      <SubmitButton>Prisijungti</SubmitButton>
      <p className="text-center"><Link href="/pamirsau-slaptazodi" className={link}>Pamiršau slaptažodį</Link></p>
      <p className="text-center text-muted">Neturite paskyros? <Link href="/registracija" className={link}>Registruotis</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="fullName" label="Vardas ir pavardė" autoComplete="name" />
      <Field name="email" label="El. paštas" type="email" autoComplete="email" />
      <Field name="password" label="Slaptažodis" type="password" autoComplete="new-password" minLength={8} hint="Bent 8 simboliai." />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" className="mt-1 h-5 w-5 accent-[#1456E8]" />
        <span className="text-sm">
          Susipažinau su <Link href="/privatumas" className={link}>privatumo politika</Link>.
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton>Sukurti paskyrą</SubmitButton>
      <p className="text-center text-sm text-muted">Banko kortelės nereikia. 14 dienų išbandymas nemokamas.</p>
      <p className="text-center text-muted">Jau turite paskyrą? <Link href="/prisijungimas" className={link}>Prisijungti</Link></p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="email" label="El. paštas" type="email" autoComplete="email" />
      <FormMessage state={state} />
      <SubmitButton>Siųsti atkūrimo nuorodą</SubmitButton>
      <p className="text-center"><Link href="/prisijungimas" className={link}>Grįžti į prisijungimą</Link></p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="password" label="Naujas slaptažodis" type="password" autoComplete="new-password" minLength={8} hint="Bent 8 simboliai." />
      <Field name="confirm" label="Pakartokite slaptažodį" type="password" autoComplete="new-password" minLength={8} />
      <FormMessage state={state} />
      <SubmitButton>Išsaugoti slaptažodį</SubmitButton>
    </form>
  );
}

export function CreateCompanyForm() {
  const [state, action] = useActionState(createCompany, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Įmonės pavadinimas" autoComplete="organization" />
      <FormMessage state={state} />
      <SubmitButton>Sukurti įmonę</SubmitButton>
    </form>
  );
}
