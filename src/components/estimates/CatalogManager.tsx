"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteCatalogItem, saveCatalogItem } from "@/lib/estimates/actions";
import { KIND_LABEL, LINE_KINDS, UNITS, DEFAULT_UNIT, formatEuro, formatInputCents, type LineKind } from "@/lib/estimates/calc";
import { fold } from "@/lib/estimates/search";
import type { CatalogRow } from "@/lib/estimates/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "@/components/admin/ui";

type Form = { id?: string; kind: LineKind; name: string; unit: string; price: string };
type Note = { ok: boolean; text: string } | null;
const NEW: Form = { kind: "material", name: "", unit: DEFAULT_UNIT.material, price: "" };

function ItemForm({ initial, onMsg, onDone, submitLabel }: { initial: Form; onMsg: (m: Note) => void; onDone: () => void; submitLabel: string }) {
  const [f, setF] = useState<Form>(initial);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveCatalogItem(f);
      onMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
      if (r.ok) onDone();
    });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Rūšis">
        <select
          value={f.kind}
          onChange={(e) => {
            const kind = e.target.value as LineKind;
            setF({ ...f, kind, unit: f.unit === DEFAULT_UNIT[f.kind] ? DEFAULT_UNIT[kind] : f.unit });
          }}
          className={inputCls}
        >
          {LINE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </Field>
      <Field label="Pavadinimas"><input value={f.name} maxLength={200} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
      <Field label="Vienetas"><input list="catalog-units" value={f.unit} maxLength={20} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inputCls} /></Field>
      <Field label="Kaina, € (vienetui)"><input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inputCls} placeholder="12,50" /></Field>
      <div className="sm:col-span-2">
        <button type="button" disabled={pending} onClick={save} className={primaryBtn}>{pending ? "Saugoma..." : submitLabel}</button>
      </div>
    </div>
  );
}

function ItemCard({ item, onMsg }: { item: CatalogRow; onMsg: (m: Note) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      const r = await deleteCatalogItem(item.id);
      onMsg(r.ok ? { ok: true, text: r.message ?? "Ištrinta." } : { ok: false, text: r.error });
    });
  return (
    <li className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold">{item.name}</p>
          <p className="text-sm text-muted">{KIND_LABEL[item.kind]}</p>
        </div>
        <p className="shrink-0 text-right font-bold">{formatEuro(item.priceCents)} <span className="font-normal text-muted">/ {item.unit}</span></p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(!open)} className={ghostBtn}>{open ? "Uždaryti" : "Redaguoti"}</button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { if (confirm(`Ištrinti „${item.name}“ iš katalogo? Esamos sąmatos nesikeis.`)) remove(); }}
          className={`${ghostBtn} text-danger`}
        >
          Ištrinti
        </button>
      </div>
      {open && (
        <ItemForm
          initial={{ id: item.id, kind: item.kind, name: item.name, unit: item.unit, price: formatInputCents(item.priceCents) }}
          onMsg={onMsg}
          onDone={() => setOpen(false)}
          submitLabel="Išsaugoti"
        />
      )}
    </li>
  );
}

export default function CatalogManager({ items, truncated }: { items: CatalogRow[]; truncated: boolean }) {
  const [kind, setKind] = useState<LineKind | "all">("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<Note>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const fq = fold(q);
    return items
      .filter((i) => (kind === "all" || i.kind === kind) && (!fq || fold(i.name).includes(fq)))
      .sort((a, b) => fold(a.name).localeCompare(fold(b.name), "lt"));
  }, [items, kind, q]);

  return (
    <div className="space-y-4">
      <datalist id="catalog-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <p className="text-sm text-muted">
        Katalogas pildosi pats: išsaugojus sąmatą nauji pavadinimai ir paskutinės kainos įrašomi čia, o kitą kartą siūlomi rašant sąmatą.
        Kiekius kiekvieną kartą įvedate patys.
      </p>

      <div className="rounded-card bg-white p-5 shadow-card">
        <button type="button" onClick={() => setAdding(!adding)} className={ghostBtn}>{adding ? "Uždaryti" : "Pridėti naują poziciją"}</button>
        {adding && <ItemForm initial={NEW} onMsg={setMsg} onDone={() => setAdding(false)} submitLabel="Pridėti" />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Paieška"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} placeholder="Pavadinimo dalis" /></Field>
        <Field label="Rūšis">
          <select value={kind} onChange={(e) => setKind(e.target.value as LineKind | "all")} className={inputCls}>
            <option value="all">Visos</option>
            {LINE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </Field>
      </div>

      <Msg msg={msg} />
      {truncated && <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-800">Rodoma tik 5000 naujausių įrašų.</p>}

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted shadow-card">
          {items.length === 0 ? "Katalogas kol kas tuščias. Išsaugokite pirmą sąmatą arba pridėkite poziciją ranka." : "Nieko nerasta."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">Įrašų: {filtered.length}</p>
          <ul className="space-y-3">{filtered.map((i) => <ItemCard key={i.id} item={i} onMsg={setMsg} />)}</ul>
        </>
      )}
    </div>
  );
}
