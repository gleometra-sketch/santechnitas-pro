"use client";

import { useState, useTransition } from "react";
import { Euro, Mail, Timer, UserMinus, UserPlus, Undo2 } from "lucide-react";
import { TIME_MODE_LABEL, type TimeMode } from "@/lib/work/types";
import { inviteMember, removeMember, restoreMember, setCompanyTimeMode, setMemberRate, setMemberRole, setMemberTimeMode } from "@/lib/admin/actions";
import { formatMoney } from "@/lib/money";
import { ROLE_LABEL, type MemberRow } from "@/lib/admin/types";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

function RateEditor({ m, today, onMsg }: { m: MemberRow; today: string; onMsg: (x: { ok: boolean; text: string } | null) => void }) {
  const [value, setValue] = useState(m.rateCents === null ? "" : String(m.rateCents / 100).replace(".", ","));
  const [from, setFrom] = useState(today);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await setMemberRate(m.userId as string, value, from);
      onMsg(r.ok ? { ok: true, text: `${m.name ?? m.email}: ${r.message ?? "išsaugota."}` } : { ok: false, text: r.error });
    });
  return (
    <div className="mt-3 rounded-xl bg-surface p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
        <Euro size={15} aria-hidden /> Valandinis įkainis
        <span className="font-normal">{m.rateCents === null ? "(nenustatytas)" : `(dabar ${formatMoney(m.rateCents)}/val.)`}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs text-muted">€ / val.</span>
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="pvz. 12,50" className="mt-0.5 min-h-11 w-28 rounded-lg border border-black/15 bg-white px-3" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Taikyti nuo</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-0.5 min-h-11 rounded-lg border border-black/15 bg-white px-3" />
        </label>
        <button disabled={pending || !value.trim()} onClick={save} className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-60">{pending ? "Saugoma..." : "Išsaugoti"}</button>
      </div>
      <p className="mt-1.5 text-xs text-muted">Įkainį mato tik administratoriai. Ankstesnių dienų suma skaičiuojama pagal tada galiojusį įkainį.</p>
    </div>
  );
}

function Row({ m, selfId, companyMode, today, onMsg }: { m: MemberRow; selfId: string; companyMode: TimeMode; today: string; onMsg: (x: { ok: boolean; text: string } | null) => void }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      onMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
    });
  const isSelf = m.userId === selfId;
  const locked = m.role === "owner" || isSelf;

  return (
    <li className={`rounded-card bg-white p-5 shadow-card ${m.status === "removed" ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{m.name ?? m.email}{isSelf && <span className="ml-2 text-sm font-medium text-muted">(jūs)</span>}</p>
          {m.name && <p className="flex items-center gap-1 truncate text-sm text-muted"><Mail size={14} aria-hidden />{m.email}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${m.status === "active" ? "bg-go-soft text-go-dark" : m.status === "invited" ? "bg-accent-soft text-accent-dark" : "bg-surface text-muted"}`}>
          {m.status === "active" ? ROLE_LABEL[m.role] : m.status === "invited" ? "Pakviestas" : "Pašalintas"}
        </span>
      </div>
      {m.status === "invited" && <p className="mt-2 text-sm text-muted">Laukia registracijos su šiuo el. paštu ({ROLE_LABEL[m.role].toLowerCase()}).</p>}

      {m.status === "active" && (
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-muted"><Timer size={15} aria-hidden /> Laiko apskaita</span>
          <select
            disabled={pending}
            value={m.timeMode ?? "default"}
            onChange={(e) => run(() => setMemberTimeMode(m.id, e.target.value === "default" ? null : e.target.value))}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3"
          >
            <option value="default">Pagal įmonės nustatymą ({TIME_MODE_LABEL[companyMode]})</option>
            <option value="hours">{TIME_MODE_LABEL.hours}</option>
            <option value="project">{TIME_MODE_LABEL.project}</option>
          </select>
        </label>
      )}

      {m.status === "active" && m.userId && <RateEditor m={m} today={today} onMsg={onMsg} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {m.status === "active" && !locked && (
          <>
            <button disabled={pending} onClick={() => run(() => setMemberRole(m.id, m.role === "admin" ? "worker" : "admin"))} className={ghostBtn}>
              {m.role === "admin" ? "Padaryti darbuotoju" : "Padaryti administratoriumi"}
            </button>
            <button disabled={pending} onClick={() => window.confirm(`Pašalinti ${m.name ?? m.email}? Jo įrašai išliks.`) && run(() => removeMember(m.id, "active"))} className={`${ghostBtn} flex items-center gap-2 text-danger`}>
              <UserMinus size={18} aria-hidden /> Pašalinti
            </button>
          </>
        )}
        {m.status === "invited" && (
          <button disabled={pending} onClick={() => run(() => removeMember(m.id, "invited"))} className={ghostBtn}>Atšaukti pakvietimą</button>
        )}
        {m.status === "removed" && (
          <button disabled={pending} onClick={() => run(() => restoreMember(m.id))} className={`${ghostBtn} flex items-center gap-2`}><Undo2 size={18} aria-hidden /> Atkurti</button>
        )}
      </div>
    </li>
  );
}

export default function MembersAdmin({ members, selfId, companyMode, today }: { members: MemberRow[]; selfId: string; companyMode: TimeMode; today: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"worker" | "admin">("worker");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const invite = () =>
    start(async () => {
      const r = await inviteMember(email, role);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Pakviesta." } : { ok: false, text: r.error });
      if (r.ok) setEmail("");
    });

  const [mode, setMode] = useState<TimeMode>(companyMode);
  const [modePending, startMode] = useTransition();
  const changeMode = (next: TimeMode) => {
    const prev = mode;
    setMode(next);
    startMode(async () => {
      const r = await setCompanyTimeMode(next);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
      if (!r.ok) setMode(prev);
    });
  };

  const current = members.filter((m) => m.status !== "removed");
  const removed = members.filter((m) => m.status === "removed");

  return (
    <div className="space-y-4">
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Timer size={22} aria-hidden /> Laiko apskaita</h2>
        <p className="mt-1 text-sm text-muted">Numatytasis būdas visiems darbuotojams. Jį galima keisti bet kada, o konkrečiam darbuotojui nustatyti kitą žemiau.</p>
        <div role="radiogroup" aria-label="Laiko apskaitos būdas" className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["hours", "project"] as const).map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={mode === v}
              disabled={modePending}
              onClick={() => mode !== v && changeMode(v)}
              className={`rounded-2xl border-2 p-3 text-left disabled:opacity-60 ${mode === v ? "border-accent bg-accent-soft" : "border-black/10"}`}
            >
              <span className="block font-semibold">{TIME_MODE_LABEL[v]}</span>
              <span className="block text-sm text-muted">{v === "hours" ? "Darbuotojas tik pradeda ir baigia darbą." : "Prieš pradėdamas darbuotojas pasirenka objektą, o laikas skaičiuojamas kiekvienam objektui."}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-white p-5 shadow-card">
        <details>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-lg font-bold"><UserPlus size={22} aria-hidden /> Pridėti darbuotoją</summary>
          <div className="mt-3 space-y-3">
            <Field label="El. paštas"><input type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
            <Field label="Vaidmuo">
              <select value={role} onChange={(e) => setRole(e.target.value as "worker" | "admin")} className={inputCls}>
                <option value="worker">Darbuotojas</option>
                <option value="admin">Administratorius</option>
              </select>
            </Field>
            <p className="text-sm text-muted">Laiškas nesiunčiamas. Pasakykite darbuotojui užsiregistruoti tuo pačiu el. paštu, ir jis automatiškai prisijungs prie jūsų įmonės.</p>
            <button disabled={pending || !email.trim()} onClick={invite} className={`${primaryBtn} w-full`}>{pending ? "Kviečiama..." : "Pakviesti"}</button>
          </div>
        </details>
      </section>
      <Msg msg={msg} />
      <ul className="space-y-3">{current.map((m) => <Row key={m.id} m={m} selfId={selfId} companyMode={mode} today={today} onMsg={setMsg} />)}</ul>
      {removed.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer font-bold text-muted">Pašalinti ({removed.length})</summary>
          <ul className="mt-3 space-y-3">{removed.map((m) => <Row key={m.id} m={m} selfId={selfId} companyMode={mode} today={today} onMsg={setMsg} />)}</ul>
        </details>
      )}
    </div>
  );
}
