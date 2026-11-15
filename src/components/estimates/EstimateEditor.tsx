"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "@/components/admin/ui";
import { deleteEstimate, duplicateEstimate, saveEstimate } from "@/lib/estimates/actions";
import {
  DEFAULT_UNIT, KIND_ADD_LABEL, KIND_LABEL, LINE_KINDS, MAX_LINES, UNITS, calcTotals, formatEuro, formatInputCents,
  formatInputPercent, formatQty, lineTotalCents, parsePercentHundredths, parsePriceCents, parseQuantity, type LineKind,
} from "@/lib/estimates/calc";
import { catalogKey, indexCatalog, mergeCatalog, searchCatalog, type CatalogEntry } from "@/lib/estimates/search";
import { STATUSES, STATUS_LABEL, type CatalogRow, type EstimateFull, type EstimateStatus, type ProjectOption } from "@/lib/estimates/types";
import NameCombobox from "./NameCombobox";

type Line = { key: string; kind: LineKind; name: string; unit: string; qty: string; price: string };
type Head = {
  title: string; projectId: string; clientName: string; clientPhone: string; clientEmail: string; address: string;
  status: EstimateStatus; validUntil: string; notes: string; vat: string; discount: string;
};
type Note = { ok: boolean; text: string } | null;
type Problem = { level: "error" | "warn"; text: string } | null;

const AUTOSAVE_MS = 3000;
const field = "min-h-12 w-full rounded-xl border border-black/15 bg-white px-3";

const blankLine = (kind: LineKind, key: string): Line => ({ key, kind, name: "", unit: DEFAULT_UNIT[kind], qty: "", price: "" });
const snap = (h: Head, ls: Line[]) => JSON.stringify([h, ls.map((l) => [l.kind, l.name, l.unit, l.qty, l.price])]);

function problem(l: Line): Problem {
  if (!l.name.trim() && !l.qty.trim() && !l.price.trim()) return null;
  if (!l.name.trim()) return { level: "error", text: "Įrašykite pavadinimą." };
  if (l.qty.trim() && parseQuantity(l.qty) === null) return { level: "error", text: "Neteisingas kiekis (pvz. 2,5)." };
  if (l.price.trim() && parsePriceCents(l.price) === null) return { level: "error", text: "Neteisinga kaina (pvz. 12,50)." };
  if (!l.qty.trim()) return { level: "warn", text: "Įveskite kiekį." };
  if (!l.price.trim()) return { level: "warn", text: "Įveskite kainą." };
  return null;
}

/** Pozicijos, kurias išsaugojus verta įsiminti kataloge (turi pavadinimą ir kainą). */
function learnable(lines: Line[]): CatalogEntry[] {
  const now = new Date().toISOString();
  const out: CatalogEntry[] = [];
  for (const l of lines) {
    const price = l.price.trim() ? parsePriceCents(l.price) : null;
    if (!l.name.trim() || !price) continue;
    out.push({ kind: l.kind, name: l.name.trim(), unit: l.unit.trim() || DEFAULT_UNIT[l.kind], priceCents: price, lastUsedAt: now });
  }
  return out;
}

type RowProps = {
  line: Line;
  search: (q: string) => CatalogEntry[];
  known: boolean;
  problem: Problem;
  autoFocus: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  onAddNext: () => void;
};

function LineRow({ line, search, known, problem: p, autoFocus, isLast, onChange, onRemove, onAddNext }: RowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- tik naujai pridėtai eilutei

  const qty = parseQuantity(line.qty);
  const price = parsePriceCents(line.price);
  const total = qty !== null && price !== null ? lineTotalCents(qty, price) : null;
  const msgId = `${line.key}-msg`;

  return (
    <li className="space-y-2 rounded-2xl border border-black/10 bg-white p-3 shadow-card">
      <NameCombobox
        id={`${line.key}-name`}
        inputRef={nameRef}
        value={line.name}
        onChange={(name) => onChange({ name })}
        onPick={(e) => {
          onChange({ name: e.name, unit: e.unit, price: formatInputCents(e.priceCents) });
          setTimeout(() => qtyRef.current?.focus(), 0);
        }}
        search={search}
        placeholder="Pavadinimas (pradėkite rašyti, kad pasirinktumėte iš katalogo)"
        invalid={p?.level === "error" && !line.name.trim()}
        describedBy={p ? msgId : undefined}
      />
      {!known && line.name.trim() !== "" && (
        <p className="text-xs text-muted">Nauja pozicija: išsaugojus ji bus įrašyta į katalogą.</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="text-xs font-medium text-muted">Kiekis</span>
          <input
            ref={qtyRef}
            inputMode="decimal"
            value={line.qty}
            onChange={(e) => onChange({ qty: e.target.value })}
            aria-invalid={line.qty.trim() !== "" && qty === null ? true : undefined}
            aria-describedby={p ? msgId : undefined}
            className={`${field} text-right`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Vienetas</span>
          <input list="estimate-units" value={line.unit} maxLength={20} onChange={(e) => onChange({ unit: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Kaina, €</span>
          <input
            inputMode="decimal"
            value={line.price}
            onChange={(e) => onChange({ price: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (isLast && line.name.trim()) onAddNext();
              }
            }}
            aria-invalid={line.price.trim() !== "" && price === null ? true : undefined}
            aria-describedby={p ? msgId : undefined}
            className={`${field} text-right`}
          />
        </label>
        <div>
          <span className="text-xs font-medium text-muted">Suma</span>
          <p className="flex min-h-12 items-center justify-end font-bold">{total === null ? "—" : formatEuro(total)}</p>
        </div>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-2">
        {p ? (
          <p id={msgId} role={p.level === "error" ? "alert" : "status"} className={`text-sm ${p.level === "error" ? "font-medium text-danger" : "text-amber-800"}`}>
            {p.text}
          </p>
        ) : (
          <span />
        )}
        <button type="button" onClick={onRemove} aria-label={`Pašalinti eilutę${line.name ? `: ${line.name}` : ""}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <Trash2 size={20} aria-hidden />
        </button>
      </div>
    </li>
  );
}

type Props = { estimate: EstimateFull; catalog: CatalogRow[]; projects: ProjectOption[]; catalogTruncated?: boolean };

export default function EstimateEditor({ estimate, catalog, projects, catalogTruncated = false }: Props) {
  const router = useRouter();
  const keyCounter = useRef(0);
  const newKey = () => `n${keyCounter.current++}`;
  const lastAdded = useRef<string | null>(null);
  const inFlight = useRef(false);

  const [init] = useState(() => {
    const head: Head = {
      title: estimate.title, projectId: estimate.projectId ?? "", clientName: estimate.clientName, clientPhone: estimate.clientPhone,
      clientEmail: estimate.clientEmail, address: estimate.address, status: estimate.status, validUntil: estimate.validUntil, notes: estimate.notes,
      vat: formatInputPercent(estimate.vatHundredths), discount: formatInputPercent(estimate.discountHundredths),
    };
    const ls: Line[] = estimate.lines.map((l) => ({
      key: l.id, kind: l.kind, name: l.name, unit: l.unit,
      qty: l.qtyMilli ? formatQty(l.qtyMilli) : "", price: l.priceCents ? formatInputCents(l.priceCents) : "",
    }));
    // Nauja sąmata: iškart po vieną tuščią medžiagų ir darbų eilutę. Tuščios eilutės neišsaugomos.
    if (ls.length === 0) ls.push(blankLine("material", newKey()), blankLine("work", newKey()));
    return { head, ls };
  });
  // Pagrindinė informacija pradžioje atvira tik naujai sąmatai; nustatoma vieną kartą, kad rašant neužsidarytų.
  // Telefone, kai atsidaro klaviatūra, apatinis meniu paslepiamas (BottomNav): išsaugojimo juosta tada nusileidžia į apačią.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const on = (e: FocusEvent) =>
      setTyping(e.target instanceof HTMLElement && e.target.matches("input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]), textarea, select"));
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);

  const [infoOpen] = useState(() => !init.head.title && !init.head.clientName);
  const [h, setH] = useState<Head>(init.head);
  const [lines, setLines] = useState<Line[]>(init.ls);
  const [saved, setSaved] = useState(() => snap(init.head, init.ls));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Note>(null);
  const [entries, setEntries] = useState<CatalogEntry[]>(() =>
    catalog.map((c) => ({ kind: c.kind, name: c.name, unit: c.unit, priceCents: c.priceCents, lastUsedAt: c.lastUsedAt })),
  );

  const index = useMemo(() => indexCatalog(entries), [entries]);
  const known = useMemo(() => new Set(entries.map((e) => catalogKey(e.kind, e.name))), [entries]);
  const searchers = useMemo(
    () => ({
      material: (q: string) => searchCatalog(index, "material", q),
      work: (q: string) => searchCatalog(index, "work", q),
      other: (q: string) => searchCatalog(index, "other", q),
    }),
    [index],
  );

  const current = useMemo(() => snap(h, lines), [h, lines]);
  const dirty = current !== saved;
  const problems = useMemo(() => lines.map(problem), [lines]);
  const vatH = parsePercentHundredths(h.vat.trim() || "0");
  const discountH = parsePercentHundredths(h.discount.trim() || "0");
  const hasError = problems.some((p) => p?.level === "error") || vatH === null || discountH === null;
  const warnCount = problems.filter((p) => p?.level === "warn").length;

  // Skaičiuojama kiekvieną kartą keičiantis laukams: nepilnos eilutės laikinai skaičiuojamos kaip 0.
  const totals = useMemo(
    () =>
      calcTotals(
        lines.map((l) => ({ kind: l.kind, qtyMilli: parseQuantity(l.qty) ?? 0, priceCents: parsePriceCents(l.price) ?? 0 })),
        discountH ?? 0,
        vatH ?? 0,
      ),
    [lines, discountH, vatH],
  );
  const subtotalOf: Record<LineKind, number> = { material: totals.materials, work: totals.works, other: totals.other };

  const setHead = <K extends keyof Head>(k: K, v: Head[K]) => setH((prev) => ({ ...prev, [k]: v }));
  const updateLine = (key: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const addLine = (kind: LineKind) => {
    if (lines.length >= MAX_LINES) return setMsg({ ok: false, text: `Daugiausia ${MAX_LINES} eilučių.` });
    const key = newKey();
    lastAdded.current = key;
    setLines((prev) => [...prev, blankLine(kind, key)]);
  };

  const onProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    setH((prev) => ({
      ...prev,
      projectId: id,
      ...(p
        ? {
            title: prev.title || p.name,
            address: prev.address || p.address || "",
            clientName: prev.clientName || p.clientName || "",
            clientPhone: prev.clientPhone || p.clientPhone || "",
            clientEmail: prev.clientEmail || p.clientEmail || "",
          }
        : {}),
    }));
  };

  const doSave = async (learn: boolean, silent: boolean): Promise<boolean> => {
    if (inFlight.current) return false;
    if (hasError) {
      if (!silent) setMsg({ ok: false, text: "Pataisykite raudonai pažymėtus laukus." });
      return false;
    }
    const sentSnap = current;
    const sentLines = lines;
    inFlight.current = true;
    setSaving(true);
    try {
      const r = await saveEstimate({
        id: estimate.id,
        learn,
        ...h,
        lines: sentLines.map((l) => ({ kind: l.kind, name: l.name, unit: l.unit, qty: l.qty, price: l.price })),
      });
      if (!r.ok) {
        setMsg({ ok: false, text: r.error });
        return false;
      }
      setSaved(sentSnap);
      setSavedAt(new Date().toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" }));
      if (learn) setEntries((prev) => mergeCatalog(prev, learnable(sentLines)));
      setMsg(silent ? null : { ok: true, text: r.message ?? "Išsaugota." });
      return true;
    } catch {
      setMsg({ ok: false, text: "Nepavyko išsaugoti. Patikrinkite ryšį ir bandykite dar kartą." });
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  // Automatinis išsaugojimas (katalogas nekeičiamas): pakeitimai nedingsta, jei naudotojas išeina nepaspaudęs „Išsaugoti“.
  const saveRef = useRef(doSave);
  useEffect(() => {
    saveRef.current = doSave;
  });
  useEffect(() => {
    if (!dirty || hasError || saving) return;
    const t = setTimeout(() => void saveRef.current(false, true), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, hasError, saving, current]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const goBack = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (dirty) {
      if (hasError) {
        if (!confirm("Yra klaidų, todėl pakeitimų išsaugoti nepavyks. Išeiti ir juos prarasti?")) return;
      } else if (!(await doSave(false, true))) {
        if (!confirm("Nepavyko išsaugoti. Išeiti ir prarasti pakeitimus?")) return;
      }
    }
    router.push("/samata");
  };

  const duplicate = async () => {
    if (dirty && !(await doSave(false, true))) return setMsg({ ok: false, text: "Pirmiausia pataisykite klaidas ir išsaugokite sąmatą." });
    const r = await duplicateEstimate(estimate.id);
    if (r.ok) router.push(`/samata/${r.id}`);
    else setMsg({ ok: false, text: r.error });
  };

  const remove = async () => {
    if (!confirm(`Ištrinti sąmatą ${estimate.number}? Šio veiksmo atšaukti negalima.`)) return;
    const r = await deleteEstimate(estimate.id);
    if (r.ok) router.push("/samata");
    else setMsg({ ok: false, text: r.error });
  };

  const statusText = saving ? "Saugoma…" : dirty ? "Neišsaugota (išsaugoma automatiškai)" : savedAt ? `Išsaugota ${savedAt}` : "Išsaugota";

  return (
    <div className="space-y-5">
      <datalist id="estimate-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

      <div className="flex items-center justify-between gap-3">
        <Link href="/samata" onClick={goBack} className="flex min-h-11 items-center gap-1 font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <ArrowLeft size={20} aria-hidden /> Sąmatos
        </Link>
        <h1 className="font-display text-2xl font-extrabold">Sąmata {estimate.number}</h1>
      </div>

      <details open={infoOpen} className="rounded-card bg-white p-5 shadow-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-bold">
          <span className="truncate">{h.title || "Pagrindinė informacija"}</span>
          <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-sm text-muted">{STATUS_LABEL[h.status]}</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Pavadinimas">
              <input value={h.title} maxLength={200} onChange={(e) => setHead("title", e.target.value)} className={inputCls} placeholder="pvz. Vonios kambario santechnika" />
            </Field>
          </div>
          <Field label="Objektas (neprivaloma)">
            <select value={h.projectId} onChange={(e) => onProject(e.target.value)} className={inputCls}>
              <option value="">Be objekto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Būsena">
            <select value={h.status} onChange={(e) => setHead("status", e.target.value as EstimateStatus)} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Klientas"><input value={h.clientName} maxLength={160} onChange={(e) => setHead("clientName", e.target.value)} className={inputCls} /></Field>
          <Field label="Kliento telefonas"><input type="tel" value={h.clientPhone} maxLength={40} onChange={(e) => setHead("clientPhone", e.target.value)} className={inputCls} /></Field>
          <Field label="Kliento el. paštas"><input type="email" value={h.clientEmail} maxLength={200} onChange={(e) => setHead("clientEmail", e.target.value)} className={inputCls} /></Field>
          <Field label="Darbų adresas"><input value={h.address} maxLength={300} onChange={(e) => setHead("address", e.target.value)} className={inputCls} /></Field>
          <Field label="Galioja iki"><input type="date" value={h.validUntil} onChange={(e) => setHead("validUntil", e.target.value)} className={inputCls} /></Field>
          <div className="sm:col-span-2">
            <Field label="Pastabos">
              <textarea value={h.notes} maxLength={4000} rows={3} onChange={(e) => setHead("notes", e.target.value)} className={`${inputCls} py-2`} />
            </Field>
          </div>
        </div>
      </details>

      {catalogTruncated && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
          Katalogas didelis: siūlomi tik 5000 naujausių įrašų. Senesnius galite rasti puslapyje „Katalogas“.
        </p>
      )}

      {LINE_KINDS.map((kind) => {
        const items = lines.map((l, i) => ({ l, i })).filter((x) => x.l.kind === kind);
        return (
          <section key={kind} aria-labelledby={`sec-${kind}`} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`sec-${kind}`} className="text-xl font-extrabold">{KIND_LABEL[kind]}</h2>
              <p className="font-bold text-muted">{formatEuro(subtotalOf[kind])}</p>
            </div>
            {items.length > 0 && (
              <ul className="space-y-3">
                {items.map(({ l, i }, n) => (
                  <LineRow
                    key={l.key}
                    line={l}
                    search={searchers[kind]}
                    known={known.has(catalogKey(l.kind, l.name))}
                    problem={problems[i]}
                    autoFocus={l.key === lastAdded.current}
                    isLast={n === items.length - 1}
                    onChange={(patch) => updateLine(l.key, patch)}
                    onRemove={() => removeLine(l.key)}
                    onAddNext={() => addLine(kind)}
                  />
                ))}
              </ul>
            )}
            <button type="button" onClick={() => addLine(kind)} className={`${ghostBtn} flex w-full items-center justify-center gap-2`}>
              <Plus size={20} aria-hidden /> {KIND_ADD_LABEL[kind]}
            </button>
          </section>
        );
      })}

      <section aria-labelledby="sec-total" className="space-y-2 rounded-card bg-white p-5 shadow-card">
        <h2 id="sec-total" className="text-xl font-extrabold">Suma</h2>
        <dl className="space-y-1">
          {LINE_KINDS.filter((k) => k !== "other" || totals.other > 0).map((k) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted">{KIND_LABEL[k]}</dt>
              <dd className="font-semibold">{formatEuro(subtotalOf[k])}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-black/10 pt-1">
            <dt className="font-semibold">Tarpinė suma</dt>
            <dd className="font-bold">{formatEuro(totals.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="discount" className="text-muted">Nuolaida, %</label>
            </dt>
            <dd className="flex items-center gap-3">
              <input id="discount" inputMode="decimal" value={h.discount} onChange={(e) => setHead("discount", e.target.value)} aria-invalid={discountH === null ? true : undefined} className={`${field} w-24 text-right`} />
              <span className="w-24 text-right font-semibold">−{formatEuro(totals.discount)}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Suma be PVM</dt>
            <dd className="font-semibold">{formatEuro(totals.net)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="vat" className="text-muted">PVM, %</label>
            </dt>
            <dd className="flex items-center gap-3">
              <input id="vat" inputMode="decimal" value={h.vat} onChange={(e) => setHead("vat", e.target.value)} aria-invalid={vatH === null ? true : undefined} className={`${field} w-24 text-right`} />
              <span className="w-24 text-right font-semibold">{formatEuro(totals.vat)}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-black/10 pt-2">
            <dt className="text-lg font-extrabold">Iš viso su PVM</dt>
            <dd className="text-lg font-extrabold">{formatEuro(totals.total)}</dd>
          </div>
        </dl>
        {(vatH === null || discountH === null) && <p role="alert" className="text-sm font-medium text-danger">Procentas turi būti nuo 0 iki 100 (pvz. 21 arba 10,5).</p>}
        {warnCount > 0 && <p className="text-sm text-amber-800">Eilučių be kiekio ar kainos: {warnCount}. Jos skaičiuojamos kaip 0 €.</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={duplicate} className={ghostBtn}>Kopijuoti sąmatą</button>
        <button type="button" onClick={remove} className={`${ghostBtn} text-danger`}>Ištrinti</button>
      </div>
      <div className="h-24" aria-hidden />

      <div className={`fixed inset-x-0 z-20 border-t border-black/10 bg-white ${typing ? "bottom-0" : "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"}`}>
        {msg && <div className="mx-auto max-w-3xl px-4 pt-2"><Msg msg={msg} /></div>}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="text-xs text-muted">Iš viso su PVM</p>
            <p className="font-display text-2xl font-extrabold leading-tight">{formatEuro(totals.total)}</p>
            <p className="truncate text-xs text-muted">{statusText}</p>
          </div>
          <button type="button" onClick={() => void doSave(true, false)} disabled={saving} className={primaryBtn}>
            {saving ? "Saugoma…" : "Išsaugoti"}
          </button>
        </div>
      </div>
    </div>
  );
}
