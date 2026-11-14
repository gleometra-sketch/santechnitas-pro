"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, NotebookPen, RotateCcw } from "lucide-react";
import { patchMaterialItem, setMaterialPurchased, setOfficeNoteDone } from "@/lib/work/actions";
import QtyStepper from "@/components/QtyStepper";
import { UNITS, type AdminMaterialItem, type AdminNote, type MaterialStatusFilter } from "@/lib/work/types";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const qtyText = (n: number) => String(n).replace(".", ",");

const EMPTY: Record<MaterialStatusFilter, string> = {
  needed: "Trūkstamų medžiagų ir neatliktų pastabų nėra.",
  purchased: "Nupirktų medžiagų ir atliktų pastabų nėra.",
  all: "Įrašų nėra.",
};

const field = "min-h-11 rounded-lg border border-transparent bg-surface px-2 hover:border-black/20 focus:border-accent focus:bg-white focus:outline-none";

type Props = {
  item: AdminMaterialItem;
  purchased: boolean;
  onToggled: (id: string, purchased: boolean) => void;
  onError: (text: string | null) => void;
};

function Row({ item, purchased, onToggled, onError }: Props) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(qtyText(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const saved = useRef({ name: item.name, quantity: item.quantity, unit: item.unit });
  const rowRef = useRef<HTMLLIElement>(null);
  const qtyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const commitQty = (text: string = qty) => {
    const q = Number(text.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setQty(qtyText(saved.current.quantity));
      return onError("Kiekis turi būti didesnis už 0.");
    }
    const rounded = Math.round(q * 100) / 100;
    setQty(qtyText(rounded));
    if (rounded !== saved.current.quantity) void save({ quantity: rounded });
  };

  // Rodyklės: reikšmę rodome iškart, o į serverį siunčiame po trumpos pauzės (keli paspaudimai = viena užklausa).
  const stepTo = (next: string) => {
    setQty(next);
    if (qtyTimer.current) clearTimeout(qtyTimer.current);
    qtyTimer.current = setTimeout(() => { qtyTimer.current = null; commitQty(next); }, 600);
  };
  const commitNow = () => {
    if (qtyTimer.current) { clearTimeout(qtyTimer.current); qtyTimer.current = null; }
    commitQty();
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

  return (
    <li ref={rowRef} className={`px-3 py-2 ${purchased ? "bg-go-soft/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Medžiagos pavadinimas"
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={enterBlurs}
          className={`${field} w-full min-w-0 basis-full font-semibold sm:flex-1 sm:basis-0 ${purchased ? "text-muted line-through" : ""}`}
        />
        <QtyStepper label={`Kiekis: ${item.name}`} value={qty} onChange={setQty} onStep={stepTo} onCommit={commitNow} />
        <select aria-label="Matavimo vienetas" value={unit} onChange={(e) => changeUnit(e.target.value)} className={`${field} w-[5.25rem] cursor-pointer`}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <span aria-live="polite" className={`w-5 text-go-dark transition-opacity ${flash ? "opacity-100" : "opacity-0"}`}>
          <Check size={18} aria-label="Išsaugota" />
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {purchased ? (
            <button disabled={busy} onClick={toggle} aria-label={`Grąžinti į sąrašą: ${item.name}`} title="Grąžinti į sąrašą" className="flex min-h-11 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-sm font-semibold disabled:opacity-60">
              <RotateCcw size={16} aria-hidden /> Grąžinti
            </button>
          ) : (
            <button disabled={busy} onClick={toggle} aria-label={`Nupirkta: ${item.name}`} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-go-dark px-3 text-sm font-semibold text-white disabled:opacity-60">
              <Check size={18} aria-hidden /> Nupirkta
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Išsami informacija" className="flex min-h-11 w-10 items-center justify-center rounded-lg text-muted">
            <ChevronDown size={20} aria-hidden className={open ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      {open && (
        <dl className="mt-2 space-y-1 rounded-lg bg-surface p-3 text-sm">
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Darbuotojas</dt><dd className="font-medium">{item.employeeName}</dd></div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-muted">Objektas</dt>
            <dd className="font-medium">{item.projectName ? <>{item.projectName}{item.projectAddress && <span className="block font-normal text-muted">{item.projectAddress}</span>}</> : <span className="font-normal text-muted">Nenurodytas</span>}</dd>
          </div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Pateikta</dt><dd>{fmtDate(item.requestedAt)}</dd></div>
          {item.comment && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Komentaras</dt><dd>{item.comment}</dd></div>}
          {item.purchasedAt && purchased && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Nupirkta</dt><dd className="font-medium text-go-dark">{fmtDate(item.purchasedAt)}{item.purchasedByName ? ` · ${item.purchasedByName}` : ""}</dd></div>}
        </dl>
      )}
    </li>
  );
}

function NoteRow({ note, done, onToggled, onError }: { note: AdminNote; done: boolean; onToggled: (id: string, done: boolean) => void; onError: (text: string | null) => void }) {
  const [busy, setBusy] = useState(false);
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
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <span className="flex items-center gap-1 font-bold text-amber-800"><NotebookPen size={16} aria-hidden /> Pastaba biurui</span>
            <span className="font-medium text-muted">{note.authorName} · {fmtDate(note.createdAt)}</span>
          </p>
          <p className={`mt-1 whitespace-pre-wrap break-words text-base font-semibold ${done ? "text-muted line-through" : ""}`}>
            {note.body || (note.voice ? "(balso pastaba be teksto)" : "")}
          </p>
        </div>
        {done ? (
          <button disabled={busy} onClick={toggle} aria-label="Grąžinti pastabą į neatliktų sąrašą" className="flex min-h-11 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-sm font-semibold disabled:opacity-60">
            <RotateCcw size={16} aria-hidden /> Grąžinti
          </button>
        ) : (
          <button disabled={busy} onClick={toggle} aria-label="Pažymėti pastabą atlikta" className="flex min-h-11 items-center gap-1.5 rounded-lg bg-go-dark px-3 text-sm font-semibold text-white disabled:opacity-60">
            <Check size={18} aria-hidden /> Atlikta
          </button>
        )}
      </div>
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
      <p className="text-sm text-muted">Rodoma įrašų: {visible.length}. Medžiagų pavadinimą, kiekį ar vienetą galite keisti tiesiai eilutėje; pastabos žymimos „Atlikta“.</p>
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
