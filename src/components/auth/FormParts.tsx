"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/auth/actions";

export function Field(props: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
  defaultValue?: string;
}) {
  const { name, label, type = "text", autoComplete, hint, minLength, defaultValue } = props;
  return (
    <div>
      <label htmlFor={name} className="block font-medium">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="mt-1 min-h-12 w-full rounded-2xl border border-black/15 px-3 text-base focus:border-accent focus:outline-none"
      />
      {hint && <p id={`${name}-hint`} className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-white active:bg-accent-dark disabled:opacity-60"
    >
      {pending ? "Palaukite..." : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-2xl bg-red-50 p-3 font-medium text-danger">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-2xl bg-go-soft p-3 font-medium text-go-dark">{state.message}</p>;
  return null;
}
