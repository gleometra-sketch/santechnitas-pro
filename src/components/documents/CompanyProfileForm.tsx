"use client";

import { useState, useTransition } from "react";
import SignaturePad, { imageToSignaturePng } from "@/components/documents/SignaturePad";
import { saveCompanyProfile } from "@/lib/documents/actions";
import type { Seller } from "@/lib/documents/logic";
import { Field, Msg, inputCls, primaryBtn } from "@/components/admin/ui";

const FIELDS: [keyof Seller, string][] = [
  ["legal_name", "Įmonės pavadinimas"], ["code", "Įmonės / veiklos kodas"], ["vat_code", "PVM kodas (jei esate PVM mokėtojas)"],
  ["address", "Adresas"], ["phone", "Telefonas"], ["email", "El. paštas"], ["iban", "Banko sąskaita (IBAN)"],
  ["director", "Direktoriaus vardas ir pavardė (parašui sutartyje)"], ["director_title", "Pareigos (pvz. Direktorius, Direktorė)"],
];

export default function CompanyProfileForm({ initial }: { initial: Seller }) {
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(([k]) => [k, initial[k] ?? ""])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [sig, setSig] = useState<string>(initial.signature ?? "");
  const [drawing, setDrawing] = useState(false);
  const [sigErr, setSigErr] = useState<string | null>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setSigErr(null);
    try { setSig(await imageToSignaturePng(file)); setDrawing(false); } catch (e) { setSigErr(e instanceof Error ? e.message : "Nepavyko įkelti nuotraukos."); }
  };
  const save = () => start(async () => { const r = await saveCompanyProfile({ ...f, signature: sig }); setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error }); });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {FIELDS.map(([k, label]) => (
        <Field key={k} label={label}><input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls} /></Field>
      ))}
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium text-muted">Rangovo (direktoriaus) parašas</p>
        <p className="text-xs text-muted">Įrašykite vieną kartą: jis automatiškai atsiras kiekvienoje naujoje sutartyje, šalia jūsų rekvizitų.</p>
        {sig && !drawing && (
          <div className="rounded-xl border border-black/15 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sig} alt="Rangovo parašas" className="aspect-[3/1] w-full max-w-xs object-contain object-left" />
          </div>
        )}
        {drawing && <SignaturePad onChange={(png) => { if (png) setSig(png); }} hint="Pasirašykite pirštu ar pele" emptyText="Pasirašykite laukelyje" doneText="✓ Parašas nupieštas (nepamirškite išsaugoti)" />}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setDrawing((d) => !d); setSigErr(null); }} className="min-h-11 rounded-xl border border-black/15 bg-white px-4 font-semibold">{drawing ? "Baigti piešimą" : sig ? "Pasirašyti iš naujo" : "Pasirašyti pirštu"}</button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-black/15 bg-white px-4 font-semibold">
            Įkelti parašo nuotrauką
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {sig && <button type="button" onClick={() => { setSig(""); setDrawing(false); }} className="min-h-11 rounded-xl px-4 font-semibold text-danger underline">Pašalinti parašą</button>}
        </div>
        {sigErr && <p role="alert" className="text-sm text-danger">{sigErr}</p>}
        <p className="text-xs text-muted">Nuotrauka: parašas juodu tušinuku ant balto popieriaus, gerai apšviestas. Fonas pašalinamas automatiškai.</p>
        <Msg msg={msg} />
        <button disabled={pending} onClick={save} className={primaryBtn}>{pending ? "Saugoma..." : "Išsaugoti rekvizitus"}</button>
        <p className="text-xs text-muted">Rekvizitai rodomi klientui sąmatose ir sutartyse. Išsiuntus dokumentą jo rekvizitai ir parašas nebesikeičia.</p>
      </div>
    </div>
  );
}
