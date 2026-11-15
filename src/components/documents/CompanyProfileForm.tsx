"use client";

import { useState, useTransition } from "react";
import { saveCompanyProfile } from "@/lib/documents/actions";
import type { Seller } from "@/lib/documents/logic";
import { Field, Msg, inputCls, primaryBtn } from "@/components/admin/ui";

const FIELDS: [keyof Seller, string][] = [
  ["legal_name", "Įmonės pavadinimas"], ["code", "Įmonės / veiklos kodas"], ["vat_code", "PVM kodas (jei esate PVM mokėtojas)"],
  ["address", "Adresas"], ["phone", "Telefonas"], ["email", "El. paštas"], ["iban", "Banko sąskaita (IBAN)"],
];

export default function CompanyProfileForm({ initial }: { initial: Seller }) {
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(([k]) => [k, initial[k] ?? ""])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveCompanyProfile(f); setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error }); });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {FIELDS.map(([k, label]) => (
        <Field key={k} label={label}><input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls} /></Field>
      ))}
      <div className="space-y-2 sm:col-span-2">
        <Msg msg={msg} />
        <button disabled={pending} onClick={save} className={primaryBtn}>{pending ? "Saugoma..." : "Išsaugoti rekvizitus"}</button>
        <p className="text-xs text-muted">Rekvizitai rodomi klientui sąmatose ir sutartyse. Išsiuntus dokumentą jo rekvizitai nebesikeičia.</p>
      </div>
    </div>
  );
}
