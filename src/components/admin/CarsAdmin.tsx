"use client";

import { useState, useTransition } from "react";
import { deleteCar, saveCar, setCarActive } from "@/lib/cars/actions";
import CarStatusTiles from "@/components/CarStatusTiles";
import { REMINDER_CHOICES, type CarRow } from "@/lib/cars/logic";
import type { CarAssignmentRow } from "@/lib/cars/queries";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

export type DriverOption = { userId: string; name: string };
type Form = {
  id?: string; name: string; plate: string; vin: string; driverId: string; km: string;
  oilLastKm: string; oilIntervalKm: string; oilWarnKm: string; reminderDays: string;
  inspectionUntil: string; roadTaxUntil: string; insuranceUntil: string;
};
type Note = { ok: boolean; text: string } | null;

const EMPTY: Form = {
  name: "", plate: "", vin: "", driverId: "", km: "", oilLastKm: "0", oilIntervalKm: "10000", oilWarnKm: "1000",
  reminderDays: "14", inspectionUntil: "", roadTaxUntil: "", insuranceUntil: "",
};
const fromCar = (c: CarRow): Form => ({
  id: c.id, name: c.name, plate: c.plate, vin: c.vin ?? "", driverId: c.driver_id ?? "", km: String(c.km),
  oilLastKm: String(c.oil_last_km), oilIntervalKm: String(c.oil_interval_km), oilWarnKm: String(c.oil_warn_km),
  reminderDays: String(c.reminder_days), inspectionUntil: c.inspection_until ?? "", roadTaxUntil: c.road_tax_until ?? "", insuranceUntil: c.insurance_until ?? "",
});

function CarForm({ initial, drivers, isNew, onMsg, onDone }: { initial: Form; drivers: DriverOption[]; isNew: boolean; onMsg: (m: Note) => void; onDone?: () => void }) {
  const [f, setF] = useState<Form>(initial);
  const [pending, start] = useTransition();
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = () =>
    start(async () => {
      const r = await saveCar({ ...f, km: isNew ? f.km || "0" : undefined });
      onMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
      if (r.ok) { if (isNew) setF(EMPTY); onDone?.(); }
    });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Pavadinimas"><input value={f.name} onChange={set("name")} className={inputCls} placeholder="pvz. VW Caddy" /></Field>
      <Field label="Valstybinis numeris"><input value={f.plate} onChange={set("plate")} className={inputCls} placeholder="ABC 123" /></Field>
      <Field label="Vairuotojas">
        <select value={f.driverId} onChange={set("driverId")} className={inputCls}>
          <option value="">Nepriskirta</option>
          {drivers.map((d) => <option key={d.userId} value={d.userId}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="VIN (neprivaloma)"><input value={f.vin} onChange={set("vin")} className={inputCls} /></Field>
      {isNew && <Field label="Dabartinis kilometražas"><input inputMode="numeric" value={f.km} onChange={set("km")} className={inputCls} /></Field>}
      <Field label="Paskutinio tepalų keitimo km"><input inputMode="numeric" value={f.oilLastKm} onChange={set("oilLastKm")} className={inputCls} /></Field>
      <Field label="Tepalų keitimo intervalas (km)"><input inputMode="numeric" value={f.oilIntervalKm} onChange={set("oilIntervalKm")} className={inputCls} /></Field>
      <Field label="Įspėti likus (km)"><input inputMode="numeric" value={f.oilWarnKm} onChange={set("oilWarnKm")} className={inputCls} /></Field>
      <Field label="Techninė apžiūra iki"><input type="date" value={f.inspectionUntil} onChange={set("inspectionUntil")} className={inputCls} /></Field>
      <Field label="Kelių mokestis iki"><input type="date" value={f.roadTaxUntil} onChange={set("roadTaxUntil")} className={inputCls} /></Field>
      <Field label="Draudimas iki"><input type="date" value={f.insuranceUntil} onChange={set("insuranceUntil")} className={inputCls} /></Field>
      <Field label="Priminti įvesti kilometražą">
        <select value={f.reminderDays} onChange={set("reminderDays")} className={inputCls}>
          {REMINDER_CHOICES.map((d) => <option key={d} value={d}>kas {d} d.</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button disabled={pending} onClick={save} className={primaryBtn}>{pending ? "Saugoma..." : isNew ? "Pridėti automobilį" : "Išsaugoti"}</button>
      </div>
    </div>
  );
}

function CarCard({ car, drivers, history, today, onMsg }: { car: CarRow; drivers: DriverOption[]; history: CarAssignmentRow[]; today: string; onMsg: (m: Note) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => { const r = await fn(); onMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error }); });
  const name = (id: string | null) => drivers.find((d) => d.userId === id)?.name ?? "—";
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-card ${car.active ? "" : "opacity-80"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-extrabold">{car.name} <span className="font-bold text-muted">{car.plate}</span></p>
          <p className="text-base font-semibold text-muted">Vairuotojas: {name(car.driver_id)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${car.active ? "bg-go-soft text-go-dark" : "bg-surface text-muted"}`}>{car.active ? "Aktyvus" : "Neaktyvus"}</span>
      </div>
      <CarStatusTiles car={car} today={today} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => run(() => setCarActive(car.id, !car.active))} className={ghostBtn}>{car.active ? "Pažymėti neaktyviu" : "Pažymėti aktyviu"}</button>
        <button onClick={() => setOpen(!open)} className={ghostBtn}>{open ? "Uždaryti" : "Redaguoti"}</button>
        <button disabled={pending} onClick={() => { if (confirm(`Ištrinti ${car.name}?`)) run(() => deleteCar(car.id)); }} className={`${ghostBtn} text-danger`}>Ištrinti</button>
      </div>
      {open && <CarForm initial={fromCar(car)} drivers={drivers} isNew={false} onMsg={onMsg} onDone={() => setOpen(false)} />}
      {history.length > 0 && (
        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer font-medium">Priskyrimo istorija</summary>
          <ul className="mt-1 space-y-0.5">{history.map((h, i) => <li key={i}>{name(h.driverId)}: {h.from} – {h.to ?? "dabar"}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

export default function CarsAdmin({ cars, drivers, assignments, today }: { cars: CarRow[]; drivers: DriverOption[]; assignments: CarAssignmentRow[]; today: string }) {
  const [msg, setMsg] = useState<Note>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <Msg msg={msg} />
      <button onClick={() => setAdding(!adding)} className={primaryBtn}>{adding ? "Uždaryti" : "Pridėti automobilį"}</button>
      {adding && <div className="rounded-2xl bg-white p-4 shadow-card"><CarForm initial={EMPTY} drivers={drivers} isNew onMsg={setMsg} onDone={() => setAdding(false)} /></div>}
      {cars.length === 0 && <p className="rounded-2xl bg-white p-4 text-muted shadow-card">Automobilių dar nėra.</p>}
      {cars.map((c) => <CarCard key={c.id} car={c} drivers={drivers} history={assignments.filter((a) => a.carId === c.id)} today={today} onMsg={setMsg} />)}
    </div>
  );
}
