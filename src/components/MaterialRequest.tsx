"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import MaterialLine from "@/components/MaterialLine";
import { createMaterialRequest } from "@/lib/work/actions";
import { UNITS, type MaterialRequestView } from "@/lib/work/types";

type Row = { key: number; name: string; qty: string; unit: (typeof UNITS)[number] };
const emptyRow = (key: number): Row => ({ key, name: "", qty: "", unit: "vnt." });
const ltDate = (iso: string) => new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export default function MaterialRequest({ requests }: { requests: MaterialRequestView[] }) {
  const [rows, setRows] = useState<Row[]>([emptyRow(1)]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const patch = (key: number, p: Partial<Omit<Row, "key">>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...p } : r)));

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
      const res = await createMaterialRequest({ projectId: null, items });
      if (res.ok) {
        setMsg({ ok: true, text: "Išsiųsta biurui." });
        setRows([emptyRow(Date.now())]);
      } else setMsg({ ok: false, text: res.error });
    });
  };

  return (
    <div>
      <div className="space-y-3">
          {rows.map((r, idx) => (
            <MaterialLine
              key={r.key}
              index={idx}
              value={r}
              onChange={(p) => patch(r.key, p)}
              onRemove={rows.length > 1 ? () => setRows((all) => all.filter((x) => x.key !== r.key)) : undefined}
              onError={(text) => setMsg(text ? { ok: false, text } : null)}
            />
          ))}
          <button onClick={() => setRows((all) => [...all, emptyRow(Date.now())])} className="flex min-h-11 items-center gap-1 font-semibold text-accent-dark">
            <Plus size={18} aria-hidden /> Pridėti dar vieną
          </button>

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
    </div>
  );
}
