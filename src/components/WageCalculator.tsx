"use client";

import { useEffect, useState } from "react";
import { formatEuro } from "@/lib/dates";

const RATE_KEY = "santechnitas:hourly-rate";

export default function WageCalculator({ minutes }: { minutes: number }) {
  const [rate, setRate] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RATE_KEY);
      if (saved) setRate(saved);
    } catch {}
  }, []);
  const onRate = (v: string) => {
    setRate(v);
    try { localStorage.setItem(RATE_KEY, v); } catch {}
  };
  const n = Number(rate.replace(",", "."));
  const valid = rate === "" || (Number.isFinite(n) && n >= 0);
  const pay = rate !== "" && valid ? (minutes / 60) * n : 0;

  return (
    <div>
      <label htmlFor="rate" className="mt-4 block font-medium text-muted">Valandinis įkainis, €/val.</label>
      <input id="rate" inputMode="decimal" value={rate} onChange={(e) => onRate(e.target.value)} placeholder="0" aria-invalid={!valid} className="mt-1 w-full rounded-2xl border border-black/15 p-3 text-lg focus:border-accent focus:outline-none" />
      {!valid && <p role="alert" className="mt-1 text-sm text-danger">Įveskite skaičių, pvz. 12 arba 12,5.</p>}
      <p className="mt-4 text-xl">Atlyginimas: <strong className="text-3xl">{formatEuro(pay)}</strong></p>
      <p className="mt-1 text-muted">Prieš mokesčius. Įkainis saugomas tik šiame įrenginyje.</p>
    </div>
  );
}
