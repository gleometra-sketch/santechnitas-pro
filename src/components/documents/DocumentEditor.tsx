"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDocument, sendDocument } from "@/lib/documents/actions";
import { KIND_LABEL, buildContractText, computeTotals, countPlaceholders, eur, lineTotal, parseNum, splitGross, type DocKind, type Seller } from "@/lib/documents/logic";
import { EMPTY_ITEM, type Draft, type DraftItem } from "@/lib/documents/draft";
import type { DocumentSummary } from "@/lib/documents/types";
import type { ProjectRow } from "@/lib/admin/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "@/components/admin/ui";
import NameCombobox from "@/components/estimates/NameCombobox";
import { KIND_LABEL as LINE_KIND_LABEL, LINE_KINDS, formatInputCents, type LineKind } from "@/lib/estimates/calc";
import { learnFromItems } from "@/lib/estimates/learn";
import { indexCatalog, mergeCatalog, searchCatalog, type CatalogEntry } from "@/lib/estimates/search";
import type { CatalogRow } from "@/lib/estimates/types";

export type MainEstimate = { id: string; number: string; title: string; clientName: string; totalCents: number };

export default function DocumentEditor({ initial, projects, estimates, seller, today, catalog = [], mainEstimates = [] }: {
  initial: Draft; projects: ProjectRow[]; estimates: DocumentSummary[]; seller: Seller; today: string; catalog?: CatalogRow[]; mainEstimates?: MainEstimate[];
}) {
  const router = useRouter();
  const [f, setF] = useState<Draft>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const isEstimate = f.kind === "estimate";
  // Katalogas (medžiagos ir darbai su paskutinėmis kainomis): siūlymai vos įvedus pavadinimo pradžią.
  const [entries, setEntries] = useState<CatalogEntry[]>(() => catalog.map((c) => ({ kind: c.kind, name: c.name, unit: c.unit, priceCents: c.priceCents, lastUsedAt: c.lastUsedAt })));
  const index = useMemo(() => indexCatalog(entries), [entries]);
  const search = useCallback((q: string) => searchCatalog(index, "any", q), [index]);
  const pickEntry = (i: number, e: CatalogEntry) => {
    setItem(i, { description: e.name, kind: e.kind, unit: e.unit, unit_price: formatInputCents(e.priceCents) });
    // Kursorius pereina į kiekį: jį įvedame kiekvieną kartą.
    setTimeout(() => {
      const el = document.getElementById(`item-${i}-qty`) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 0);
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<DraftItem>) => setF((p) => ({ ...p, items: p.items.map((it, n) => (n === i ? { ...it, ...patch } : it)) }));

  const vat = parseNum(f.vatRate);
  const totals = useMemo(() => {
    if (isEstimate) return computeTotals(f.items.map((i) => ({ quantity: parseNum(i.quantity) || 0, unit_price: parseNum(i.unit_price) || 0 })), Number.isFinite(vat) ? vat : 0);
    const g = parseNum(f.totalGross);
    return splitGross(Number.isFinite(g) ? g : 0, Number.isFinite(vat) ? vat : 0);
  }, [f.items, f.totalGross, vat, isEstimate]);

  const pickProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    setF((s) => ({
      ...s, projectId: id,
      clientName: s.clientName || p?.clientName || "", clientEmail: s.clientEmail || p?.clientEmail || "", clientPhone: s.clientPhone || p?.clientPhone || "",
      workAddress: s.workAddress || p?.address || "", title: s.title || (p ? `${KIND_LABEL[s.kind]}: ${p.name}` : ""),
    }));
  };
  const pickEstimate = (id: string) => {
    if (id.startsWith("est:")) {
      const m = mainEstimates.find((x) => `est:${x.id}` === id);
      setF((s) => ({ ...s, estimateId: id, totalGross: m ? String(m.totalCents / 100) : s.totalGross }));
      return;
    }
    const e = estimates.find((x) => x.id === id);
    setF((s) => ({ ...s, estimateId: id, totalGross: e ? String(e.totalGross) : s.totalGross }));
  };
  const fillTemplate = () => {
    if (f.body.trim() && !confirm("Dabartinis sutarties tekstas bus pakeistas šablonu. Tęsti?")) return;
    const est = estimates.find((x) => x.id === f.estimateId) ?? (() => { const m = mainEstimates.find((x) => `est:${x.id}` === f.estimateId); return m ? { number: m.number } : undefined; })();
    const g = parseNum(f.totalGross);
    set("body", buildContractText({
      seller, clientName: f.clientName || "[UŽSAKOVAS]", clientAddress: f.clientAddress, workAddress: f.workAddress,
      totalGross: Number.isFinite(g) ? g : 0, vatRate: Number.isFinite(vat) ? vat : 21, estimateNumber: est?.number ?? null, today,
    }));
  };

  const payload = () => ({ ...f, id: f.id });
  const run = (send: boolean) => {
    if (send && !isEstimate) {
      const n = countPlaceholders(f.body);
      if (n > 0 && !confirm(`Sutartyje liko neužpildytų laukų [ ... ]: ${n}. Siųsti vis tiek?`)) return;
    }
    start(async () => {
      const saved = await saveDocument(payload());
      if (!saved.ok) return setMsg({ ok: false, text: saved.error });
      const id = saved.id!;
      if (saved.estimateId) setF((p) => ({ ...p, estimateId: saved.estimateId! })); // pagrindinė sąmata jau nukopijuota: kitą kartą nekuriame dar vienos
      setF((p) => ({ ...p, id })); // kad kitas išsaugojimas atnaujintų tą patį juodraštį, o ne kurtų naują
      if (isEstimate) {
        // Tos pačios pozicijos kitoje sąmatoje siūlomos iškart, be puslapio perkrovimo.
        const now = new Date().toISOString();
        setEntries((prev) => mergeCatalog(prev, learnFromItems(f.items).map((l) => ({ ...l, lastUsedAt: now }))));
      }
      if (send) {
        const sent = await sendDocument(id);
        if (!sent.ok) return setMsg({ ok: false, text: sent.error });
        return router.replace(`/valdymas/dokumentai/${id}`);
      }
      setMsg({ ok: true, text: saved.message ?? "Išsaugota." });
      if (!initial.id) router.replace(`/valdymas/dokumentai/${id}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">{f.id ? "" : "Nauja "}{KIND_LABEL[f.kind].toLowerCase()}{f.id ? " (juodraštis)" : ""}</h2>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <Field label="Pavadinimas"><input value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder={isEstimate ? "pvz. Vonios kambario santechnikos darbai" : "pvz. Santechnikos darbų sutartis"} /></Field>
        <Field label="Objektas (neprivaloma)">
          <select value={f.projectId} onChange={(e) => pickProject(e.target.value)} className={inputCls}>
            <option value="">Be objekto</option>
            {projects.filter((p) => !p.archived || p.id === f.projectId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <h3 className="text-lg font-bold">Klientas</h3>
        <Field label="Vardas, pavardė arba įmonė"><input value={f.clientName} onChange={(e) => set("clientName", e.target.value)} className={inputCls} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefonas"><input value={f.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} inputMode="tel" className={inputCls} /></Field>
          <Field label="El. paštas"><input value={f.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} inputMode="email" className={inputCls} /></Field>
        </div>
        <Field label="Kliento adresas (neprivaloma)"><input value={f.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} className={inputCls} /></Field>
        <Field label="Darbų atlikimo adresas"><input value={f.workAddress} onChange={(e) => set("workAddress", e.target.value)} className={inputCls} /></Field>
      </section>

      {isEstimate ? (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <h3 className="text-lg font-bold">Darbai ir medžiagos</h3>
          <datalist id="units">{["vnt.", "m", "m²", "m³", "val.", "kompl.", "kg", "l"].map((u) => <option key={u} value={u} />)}</datalist>
          {f.items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-black/10 p-3">
              <div className="flex items-start gap-2">
                <div className="mt-1 min-w-0 flex-1">
                  <NameCombobox
                    id={`item-${i}-name`}
                    value={it.description}
                    onChange={(description) => setItem(i, { description })}
                    onPick={(e) => pickEntry(i, e)}
                    search={search}
                    placeholder="Ką atliekame / kokia medžiaga (pradėkite rašyti)"
                  />
                </div>
                <select
                  value={it.kind}
                  onChange={(e) => setItem(i, { kind: e.target.value as LineKind })}
                  aria-label={`Eilutė ${i + 1}: rūšis`}
                  className="mt-1 min-h-12 w-28 shrink-0 rounded-xl border border-black/15 bg-white px-2 text-sm"
                >
                  {LINE_KINDS.map((k) => <option key={k} value={k}>{LINE_KIND_LABEL[k]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Kiekis"><input id={`item-${i}-qty`} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} inputMode="decimal" className={inputCls} /></Field>
                <Field label="Mato vnt."><input value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} list="units" className={inputCls} /></Field>
                <Field label="Kaina, €"><input value={it.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} inputMode="decimal" className={inputCls} placeholder="0,00" /></Field>
              </div>
              <div className="flex items-center justify-between text-sm">
                <button onClick={() => set("items", f.items.filter((_, n) => n !== i))} className="text-danger underline">Pašalinti eilutę</button>
                <span className="font-bold">{eur(lineTotal(parseNum(it.quantity) || 0, parseNum(it.unit_price) || 0))}</span>
              </div>
            </div>
          ))}
          <button onClick={() => set("items", [...f.items, { ...EMPTY_ITEM }])} className={ghostBtn}>Pridėti eilutę</button>
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <h3 className="text-lg font-bold">Kaina ir sąmata</h3>
          <Field label="Susieta sąmata (neprivaloma)">
            <select value={f.estimateId} onChange={(e) => pickEstimate(e.target.value)} className={inputCls}>
              <option value="">Be sąmatos</option>
              {estimates.filter((e) => e.status !== "cancelled" && e.status !== "declined" && (!f.projectId || e.projectId === f.projectId || e.id === f.estimateId))
                .map((e) => <option key={e.id} value={e.id}>{e.number} · {e.clientName} · {eur(e.totalGross)}</option>)}
              {mainEstimates.length > 0 && (
                <optgroup label="Sąmatos iš skilties „Sąmata“">
                  {mainEstimates.map((m) => <option key={m.id} value={`est:${m.id}`}>{m.number} · {m.title || "Be pavadinimo"}{m.clientName ? ` · ${m.clientName}` : ""} · {eur(m.totalCents / 100)}</option>)}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="Sutarties kaina su PVM, €"><input value={f.totalGross} onChange={(e) => set("totalGross", e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="PVM, %"><input value={f.vatRate} onChange={(e) => set("vatRate", e.target.value)} inputMode="decimal" className={inputCls} /></Field>
          <Field label="Galioja iki (neprivaloma)"><input type="date" value={f.validUntil} onChange={(e) => set("validUntil", e.target.value)} className={inputCls} /></Field>
        </div>
        <dl className="space-y-1 rounded-xl bg-surface p-3">
          <div className="flex justify-between"><dt>Suma be PVM</dt><dd>{eur(totals.net)}</dd></div>
          <div className="flex justify-between"><dt>PVM</dt><dd>{eur(totals.vat)}</dd></div>
          <div className="flex justify-between text-lg font-bold"><dt>Iš viso</dt><dd>{eur(totals.gross)}</dd></div>
        </dl>
        {isEstimate && <Field label="Pastabos ir sąlygos klientui (neprivaloma)"><textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={4} className={`${inputCls} min-h-0 py-2`} placeholder="pvz. Kaina galioja 14 dienų. Medžiagos pagal sąmatą, papildomi darbai suderinami atskirai." /></Field>}
      </section>

      {!isEstimate && (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <h3 className="text-lg font-bold">Sutarties tekstas</h3>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Tai šablono juodraštis, o ne teisinė konsultacija. Užpildykite laukus [SKLIAUSTUOSE] ir prieš naudojimą parodykite sutartį teisininkui.</p>
          <button onClick={fillTemplate} className={ghostBtn}>Sukurti tekstą iš šablono</button>
          <textarea value={f.body} onChange={(e) => set("body", e.target.value)} rows={22} className={`${inputCls} min-h-0 py-2 font-mono text-sm`} aria-label="Sutarties tekstas" />
          <p className="text-sm text-muted">Neužpildytų laukų: {countPlaceholders(f.body)}</p>
        </section>
      )}

      <Msg msg={msg} />
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} onClick={() => run(false)} className={ghostBtn}>{pending ? "Saugoma..." : "Išsaugoti juodraštį"}</button>
        <button disabled={pending} onClick={() => run(true)} className={primaryBtn}>Išsaugoti ir ruošti siuntimui</button>
      </div>
      <p className="text-sm text-muted">Paruošus siuntimui gausite nuorodą, kurią išsiųsite klientui. Išsiųsto dokumento redaguoti nebegalima; jį galima atšaukti ir nukopijuoti kaip naują juodraštį.</p>
    </div>
  );
}
