"use client";

import { useState, useTransition } from "react";
import { PackagePlus, Plus, X } from "lucide-react";
import { createMaterialRequest } from "@/lib/work/actions";
import { UNITS, type MaterialRequestView } from "@/lib/work/types";

type Row = { key: number; name: string; qty: string; unit: (typeof UNITS)[number] };
const emptyRow = (key: number): Row => ({ key, name: "", qty: "", unit: "vnt." });
const ltDate = (iso: string) => new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export default function MaterialRequest({ projects, requests }: { projects: { id: string; name: string; address: string | null }[]; requests: MaterialRequestView[] }) {
  const [rows, setRows] = useState<Row[]>([emptyRow(1)]);
  const [projectId, setProjectId] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const patch = (key: number, p: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const submit = () => {
    const items: { name: string; quantity: number; unit: string }[] = [];
    for (const r of rows) {
      if (!r.name.trim() && !r.qty.trim()) continue;
      const qty = Number(r.qty.replace(",", "."));
      if (!r.name.trim()) return setMsg({ ok: false, text: "Įrašykite medžiagos pavadinimą." });
      if (!Number.isFinite(qty) || qty <= 0) return setMsg({ ok: false, text: `Neteisingas kiekis: „${r.name}“.` });
      items.push({ name: r.name, quantity: qty, unit: r.unit });
    }
    start(async () => {
      const res = await createMaterialRequest({ projectId: projectId || null, comment, items });
      if (res.ok) {
        setMsg({ ok: true, text: "Išsiųsta biurui." });
        setRows([emptyRow(Date.now())]);
        setComment("");
      } else setMsg({ ok: false, text: res.error });
    });
  };

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-lg font-bold">
          <PackagePlus size={22} aria-hidden /> Reikalingos medžiagos
        </summary>
        <div className="mt-3 space-y-3">
          {rows.map((r, idx) => (
            <div key={r.key} className="grid grid-cols-[1fr_5rem_5.5rem_2.75rem] gap-2">
              <input aria-label={`Medžiaga ${idx + 1}`} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Medžiaga" maxLength={200} className="min-h-12 min-w-0 rounded-xl border border-black/15 px-3" />
              <input aria-label="Kiekis" inputMode="decimal" value={r.qty} onChange={(e) => patch(r.key, { qty: e.target.value })} placeholder="Kiekis" className="min-h-12 min-w-0 rounded-xl border border-black/15 px-2" />
              <select aria-label="Vienetas" value={r.unit} onChange={(e) => patch(r.key, { unit: e.target.value as Row["unit"] })} className="min-h-12 rounded-xl border border-black/15 bg-white px-1">
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
              <button aria-label="Pašalinti eilutę" disabled={rows.length === 1} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} className="flex min-h-12 items-center justify-center rounded-xl border border-black/10 disabled:opacity-30">
                <X size={18} aria-hidden />
              </button>
            </div>
          ))}
          <button onClick={() => setRows((all) => [...all, emptyRow(Date.now())])} className="flex min-h-11 items-center gap-1 font-semibold text-accent-dark">
            <Plus size={18} aria-hidden /> Pridėti dar vieną
          </button>

          <label className="block">
            <span className="text-sm font-medium text-muted">Objektas (nebūtina)</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-black/15 bg-white px-3">
              <option value="">Nenurodytas</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.address ? ` – ${p.address}` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Komentaras (nebūtina)</span>
            <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} className="mt-1 min-h-12 w-full rounded-xl border border-black/15 px-3" />
          </label>

          {msg && <p role={msg.ok ? "status" : "alert"} className={`font-medium ${msg.ok ? "text-go-dark" : "text-danger"}`}>{msg.text}</p>}
          <button disabled={pending} onClick={submit} className="min-h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-white disabled:opacity-60">
            {pending ? "Siunčiama..." : "Siųsti biurui"}
          </button>

          {requests.length > 0 && (
            <div className="pt-2">
              <h3 className="mb-2 font-bold">Mano prašymai</h3>
              <ul className="space-y-3">
                {requests.map((q) => (
                  <li key={q.id} className="rounded-2xl border border-black/10 p-3">
                    <p className="text-sm text-muted">{ltDate(q.createdAt)}{q.projectName ? ` · ${q.projectName}` : ""}</p>
                    <ul className="mt-1 space-y-0.5">
                      {q.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span className={i.purchased ? "text-muted line-through" : ""}>{i.name} · {i.quantity} {i.unit}</span>
                          <span className={`shrink-0 text-sm font-semibold ${i.purchased ? "text-go-dark" : "text-accent-dark"}`}>{i.purchased ? "Nupirkta" : "Laukiama"}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
