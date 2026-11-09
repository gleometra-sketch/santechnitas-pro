import type { ReactNode } from "react";

export const inputCls = "mt-1 min-h-12 w-full rounded-xl border border-black/15 bg-white px-3";
export const primaryBtn = "min-h-12 rounded-2xl bg-accent px-5 font-semibold text-white disabled:opacity-60";
export const ghostBtn = "min-h-12 rounded-2xl border border-black/15 px-4 font-semibold disabled:opacity-60";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`rounded-2xl p-3 font-medium ${msg.ok ? "bg-go-soft text-go-dark" : "bg-red-50 text-danger"}`}>
      {msg.text}
    </p>
  );
}
