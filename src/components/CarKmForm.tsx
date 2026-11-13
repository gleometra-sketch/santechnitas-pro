"use client";

import { useState, useTransition } from "react";
import { logCarKm, setCarReminderDays } from "@/lib/cars/actions";
import { REMINDER_CHOICES, validateKm } from "@/lib/cars/logic";

export default function CarKmForm({ carId, km, reminderDays }: { carId: string; km: number; reminderDays: number }) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    const n = Number(value.replace(/\s/g, ""));
    const err = validateKm(n, km);
    if (err) return setMsg({ ok: false, text: err });
    start(async () => {
      const r = await logCarKm(carId, n);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
      if (r.ok) setValue("");
    });
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Dabar ${km.toLocaleString("lt-LT")} km`}
          aria-label="Naujas kilometražo rodmuo"
          className="min-h-12 w-full rounded-xl border border-black/15 bg-white px-3"
        />
        <button disabled={pending || !value.trim()} onClick={submit} className="min-h-12 shrink-0 rounded-2xl bg-accent px-5 font-semibold text-white disabled:opacity-60">
          {pending ? "Saugoma..." : "Išsaugoti"}
        </button>
      </div>
      <label className="flex items-center justify-between gap-2 text-sm text-muted">
        Priminti įvesti kilometražą
        <select
          defaultValue={reminderDays}
          disabled={pending}
          onChange={(e) => start(async () => { const r = await setCarReminderDays(carId, Number(e.target.value)); setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error }); })}
          className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-base text-black"
        >
          {REMINDER_CHOICES.map((d) => <option key={d} value={d}>kas {d} d.</option>)}
        </select>
      </label>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl p-2 text-sm font-medium ${msg.ok ? "bg-go-soft text-go-dark" : "bg-red-50 text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
