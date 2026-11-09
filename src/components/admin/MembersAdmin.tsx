"use client";

import { useState, useTransition } from "react";
import { Mail, UserMinus, UserPlus, Undo2 } from "lucide-react";
import { inviteMember, removeMember, restoreMember, setMemberRole } from "@/lib/admin/actions";
import { ROLE_LABEL, type MemberRow } from "@/lib/admin/types";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

function Row({ m, selfId, onMsg }: { m: MemberRow; selfId: string; onMsg: (x: { ok: boolean; text: string } | null) => void }) {
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

export default function MembersAdmin({ members, selfId }: { members: MemberRow[]; selfId: string }) {
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

  const current = members.filter((m) => m.status !== "removed");
  const removed = members.filter((m) => m.status === "removed");

  return (
    <div className="space-y-4">
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
      <ul className="space-y-3">{current.map((m) => <Row key={m.id} m={m} selfId={selfId} onMsg={setMsg} />)}</ul>
      {removed.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer font-bold text-muted">Pašalinti ({removed.length})</summary>
          <ul className="mt-3 space-y-3">{removed.map((m) => <Row key={m.id} m={m} selfId={selfId} onMsg={setMsg} />)}</ul>
        </details>
      )}
    </div>
  );
}
