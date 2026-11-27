"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ListPlus, NotebookPen, RotateCcw } from "lucide-react";
import { patchMaterialItem, setMaterialPurchased, setOfficeNoteDone } from "@/lib/work/actions";
import NoteToMaterials from "@/components/NoteToMaterials";
import { UNITS, type AdminMaterialItem, type AdminNote, type MaterialStatusFilter } from "@/lib/work/types";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const qtyText = (n: number) => String(n).replace(".", ",");

const EMPTY: Record<MaterialStatusFilter, string> = {
  needed: "Trūkstamų medžiagų ir neatliktų pastabų nėra.",
  purchased: "Nupirktų medžiagų ir atliktų pastabų nėra.",
  all: "Įrašų nėra.",
};

const cell = "h-10 shrink-0 rounded-lg border bg-surface text-center font-bold hover:border-black/20 focus:border-accent focus:bg-white focus:outline-none";

type Props = {
  item: AdminMaterialItem;
  purchased: boolean;
  onToggled: (id: string, purchased: boolean) => void;
  onError: (text: string | null) => void;
};

/**
 * Viena medžiaga vienoje eilutėje: [varnelė „nupirkta“] pavadinimas · kiekis · vienetas · [rodyklė].
 * Rodyklė (arba pavadinimo paspaudimas) išskleidžia: kas užsakė, objektą, kada pateikta, komentarą.
 */
function Row({ item, purchased, onToggled, onError }: Props) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(qtyText(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const saved = useRef({ name: item.name, quantity: item.quantity, unit: item.unit });
  const rowRef = useRef<HTMLLIElement>(null);

  // Po serverio duomenų atnaujinimo sinchronizuojame laukus, bet nelaužome to, ką žmogus šiuo metu rašo.
  useEffect(() => {
    if (rowRef.current?.contains(document.activeElement)) return;
    saved.current = { name: item.name, quantity: item.quantity, unit: item.unit };
    setName(item.name);
    setQty(qtyText(item.quantity));
    setUnit(item.unit);
  }, [item.name, item.quantity, item.unit]);

  const save = async (patch: { name?: string; quantity?: number; unit?: string }) => {
    onError(null);
    const res = await patchMaterialItem(item.id, patch);
    if (res.ok) {
      saved.current = { ...saved.current, ...patch } as typeof saved.current;
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    } else {
      // Grąžiname paskutinę išsaugotą reikšmę.
      setName(saved.current.name);
      setQty(qtyText(saved.current.quantity));
      setUnit(saved.current.unit);
      onError(`${saved.current.name}: ${res.error}`);
    }
  };

  const commitName = () => {
    const n = name.trim();
    if (!n) {
      setName(saved.current.name);
      return onError("Pavadinimas negali būti tuščias.");
    }
    setName(n);
    if (n !== saved.current.name) void save({ name: n });
  };

  const commitQty = () => {
    const q = Number(qty.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setQty(qtyText(saved.current.quantity));
      return onError("Kiekis turi būti didesnis už 0.");
    }
    const rounded = Math.round(q * 100) / 100;
    setQty(qtyText(rounded));
    if (rounded !== saved.current.quantity) void save({ quantity: rounded });
  };

  const changeUnit = (u: string) => {
    setUnit(u);
    if (u !== saved.current.unit) void save({ unit: u });
  };

  const toggle = async () => {
    setBusy(true);
    onError(null);
    const res = await setMaterialPurchased(item.id, !purchased);
    setBusy(false);
    if (res.ok) onToggled(item.id, !purchased);
    else onError(`${item.name}: ${res.error}`);
  };

  const enterBlurs = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const detailsId = `mat-details-${item.id}`;
  const flashCls = flash ? "border-go-dark bg-go-soft" : "border-transparent";

  return (
    <li ref={rowRef} className={`px-2 py-1 ${purchased ? "bg-go-soft/40" : ""}`}>
      <div className="flex min-h-12 items-center gap-1.5">
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center" title={purchased ? "Grąžinti į sąrašą" : "Pažymėti kaip nupirktą"}>
          <input
            type="checkbox"
            checked={purchased}
            disabled={busy}
            onChange={toggle}
            aria-label={`Nupirkta: ${item.name}`}
            className="h-6 w-6 cursor-pointer accent-go-dark"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
          className={`line-clamp-2 min-w-0 flex-1 break-words text-left text-[15px] font-semibold leading-tight ${purchased ? "text-muted line-through" : ""}`}
        >
          {name}
        </button>
        <input
          aria-label={`Kiekis: ${item.name}`}
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={commitQty}
          onKeyDown={enterBlurs}
          onFocus={(e) => e.currentTarget.select()}
          className={`${cell} w-12 px-0.5 tabular-nums ${flashCls}`}
        />
        <select
          aria-label={`Matavimo vienetas: ${item.name}`}
          value={unit}
          onChange={(e) => changeUnit(e.target.value)}
          className={`${cell} w-[3.75rem] cursor-pointer px-0.5 text-sm font-semibold ${flashCls}`}
        >
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={`Išsami informacija: ${item.name}`}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-muted"
        >
          <ChevronDown size={20} aria-hidden className={open ? "rotate-180" : ""} />
        </button>
      </div>

      {open && (
        <div id={detailsId} className="mb-1 mt-1 space-y-2 rounded-lg bg-surface p-3 text-sm">
          <dl className="space-y-1">
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Užsakė</dt><dd className="font-medium">{item.employeeName}</dd></div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted">Objektas</dt>
              <dd className="font-medium">{item.projectName ? <>{item.projectName}{item.projectAddress && <span className="block font-normal text-muted">{item.projectAddress}</span>}</> : <span className="font-normal text-muted">Be objekto</span>}</dd>
            </div>
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Pateikta</dt><dd>{fmtDate(item.requestedAt)}</dd></div>
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Komentaras</dt><dd>{item.comment ? item.comment : <span className="text-muted">Nėra</span>}</dd></div>
            {purchased && item.purchasedAt && (
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Nupirkta</dt><dd className="font-medium text-go-dark">{fmtDate(item.purchasedAt)}{item.purchasedByName ? ` · ${item.purchasedByName}` : ""}</dd></div>
            )}
          </dl>
          <label className="block">
            <span className="text-muted">Pavadinimas (galite pataisyti)</span>
            <input
              aria-label={`Medžiagos pavadinimas: ${item.name}`}
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={enterBlurs}
              className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-white px-2 font-semibold focus:border-accent focus:outline-none"
            />
          </label>
        </div>
      )}
    </li>
  );
}

function NoteRow({ note, done, onToggled, onError }: { note: AdminNote; done: boolean; onToggled: (id: string, done: boolean) => void; onError: (text: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const toggle = async () => {
    setBusy(true);
    onError(null);
    const res = await setOfficeNoteDone(note.id, !done);
    setBusy(false);
    if (res.ok) onToggled(note.id, !done);
    else onError(`Pastaba (${note.authorName}): ${res.error}`);
  };
  return (
    <li className={`px-3 py-3 ${done ? "bg-go-soft/40" : "bg-amber-50/70"}`}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span className="flex items-center gap-1 font-bold text-amber-800"><NotebookPen size={16} aria-hidden /> Pastaba biurui</span>
        <span className="font-medium text-muted">{note.authorName} · {fmtDate(note.createdAt)}</span>
      </p>
      <p className={`mt-1 whitespace-pre-wrap break-words text-base font-semibold ${done ? "text-muted line-through" : ""}`}>
        {note.body || (note.voice ? "(balso pastaba be teksto)" : "")}
      </p>
      <div className={`mt-2 flex flex-wrap gap-2 ${done ? "justify-end" : ""}`}>
        {done ? (
          <button disabled={busy} onClick={toggle} aria-label="Grąžinti pastabą į neatliktų sąrašą" title="Grąžinti į neatliktų sąrašą" className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/15 text-muted hover:text-ink disabled:opacity-60">
            <RotateCcw size={16} aria-hidden />
          </button>
        ) : (
          <>
            <button onClick={() => setSplitting((v) => !v)} aria-expanded={splitting} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 font-semibold text-white">
              <ListPlus size={18} aria-hidden /> Į medžiagas
            </button>
            <button disabled={busy} onClick={toggle} aria-label="Pažymėti pastabą atlikta" className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-go-dark px-3 font-semibold text-white disabled:opacity-60">
              <Check size={18} aria-hidden /> Atlikta
            </button>
          </>
        )}
      </div>
      {splitting && !done && <NoteToMaterials noteId={note.id} body={note.body} onSaved={() => { setSplitting(false); onToggled(note.id, true); }} />}
    </li>
  );
}

export default function MaterialsList({ items, notes, view, truncated }: { items: AdminMaterialItem[]; notes: AdminNote[]; view: MaterialStatusFilter; truncated: boolean }) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Vietinė (optimistinė) „nupirkta“ būsena, kol serveris atsiunčia naujus duomenis.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOverrides((o) => {
      const next: Record<string, boolean> = {};
      for (const [id, v] of Object.entries(o)) {
        const s = items.find((i) => i.id === id);
        const n = notes.find((x) => x.id === id);
        if (s && s.purchased !== v) next[id] = v; // serveris dar nepasiekė šios būsenos
        if (n && n.isDone !== v) next[id] = v;
      }
      return Object.keys(next).length === Object.keys(o).length ? o : next;
    });
  }, [items, notes]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onToggled = (id: string, purchased: boolean) => {
    setOverrides((o) => ({ ...o, [id]: purchased }));
    // Suvestinę ir sąrašą atnaujiname fone, sujungdami kelis paspaudimus į vieną užklausą.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startRefresh(() => router.refresh()), 700);
  };

  const isPurchased = (i: AdminMaterialItem) => overrides[i.id] ?? i.purchased;
  const isDone = (n: AdminNote) => overrides[n.id] ?? n.isDone;

  // Medžiagos ir pastabos viename sąraše, naujausios pirmos („nupirktų“ rodinyje – pagal pirkimo / atlikimo laiką).
  type Entry = { key: string; at: number; item?: AdminMaterialItem; note?: AdminNote };
  const ts = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);
  const entries: Entry[] = [
    ...items
      .filter((i) => view === "all" || (view === "purchased") === isPurchased(i))
      .map((i) => ({ key: `m-${i.id}`, item: i, at: ts(view === "purchased" ? i.purchasedAt ?? i.requestedAt : i.requestedAt) })),
    ...notes
      .filter((n) => view === "all" || (view === "purchased") === isDone(n))
      .map((n) => ({ key: `n-${n.id}`, note: n, at: ts(view === "purchased" ? n.updatedAt : n.createdAt) })),
  ].sort((a, b) => b.at - a.at);
  const visible = entries;

  return (
    <section aria-label="Medžiagų sąrašas" className="space-y-3">
      <p className="text-sm text-muted">Rodoma įrašų: {visible.length}. Varnelė žymi nupirktą medžiagą; kiekį ir vienetą keiskite eilutėje. Paspaudę pavadinimą ar rodyklę pamatysite, kas užsakė, objektą, pateikimo laiką ir komentarą; pastabos žymimos „Atlikta“.</p>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 font-medium text-danger">{error}</p>}
      {visible.length === 0 && <p className="rounded-card bg-white p-5 text-muted shadow-card">{EMPTY[view]}</p>}
      {visible.length > 0 && (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-card bg-white shadow-card">
          {visible.map((e) =>
            e.item ? (
              <Row key={e.key} item={e.item} purchased={isPurchased(e.item)} onToggled={onToggled} onError={setError} />
            ) : (
              <NoteRow key={e.key} note={e.note!} done={isDone(e.note!)} onToggled={onToggled} onError={setError} />
            ),
          )}
        </ul>
      )}
      {truncated && <p className="text-sm text-muted">Rodomi naujausi 500 įrašų. Siaurinkite sąrašą filtrais.</p>}
    </section>
  );
}
