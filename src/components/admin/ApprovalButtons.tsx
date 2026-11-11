"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, Unlock } from "lucide-react";
import { approveMonth, approveMonthAll, revokeMonthApproval } from "@/lib/admin/actions";
import type { ActionResult } from "@/lib/work/types";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Vieno darbuotojo mėnesio patvirtinimas / atšaukimas. */
export function ApprovalControl({ userId, ym, name, approvedAt, canApprove, hint }: { userId: string; ym: string; name: string; approvedAt: string | null; canApprove: boolean; hint?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : { ok: false, text: r.error });
    });

  if (approvedAt) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-go-soft px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-go-dark"><Lock size={15} aria-hidden /> Patvirtinta {fmt(approvedAt)}</p>
        <button
          disabled={pending}
          onClick={() => window.confirm(`Atšaukti ${name} valandų patvirtinimą? Po to įrašus vėl bus galima keisti.`) && run(() => revokeMonthApproval(userId, ym))}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold disabled:opacity-60"
        >
          <Unlock size={15} aria-hidden /> Atšaukti
        </button>
        {msg && <p role="alert" className="w-full text-sm font-medium text-danger">{msg.text}</p>}
      </div>
    );
  }
  return (
    <div className="mt-3">
      <button
        disabled={pending || !canApprove}
        onClick={() => run(() => approveMonth(userId, ym))}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white disabled:opacity-50"
      >
        <CheckCircle2 size={18} aria-hidden /> {pending ? "Tvirtinama..." : "Patvirtinti valandas"}
      </button>
      {!canApprove && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {msg && <p role="alert" className="mt-1 text-sm font-medium text-danger">{msg.text}</p>}
    </div>
  );
}

/** Visų darbuotojų mėnesio patvirtinimas. */
export function ApproveAllButton({ ym }: { ym: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          window.confirm("Patvirtinti visų darbuotojų šio mėnesio valandas? Patvirtintų įrašų keisti nebebus galima, kol neatšauksite.") &&
          start(async () => {
            const r = await approveMonthAll(ym);
            setMsg(r.ok ? { ok: true, text: r.message ?? "Patvirtinta." } : { ok: false, text: r.error });
          })
        }
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white disabled:opacity-60"
      >
        <CheckCircle2 size={18} aria-hidden /> {pending ? "Tvirtinama..." : "Patvirtinti visus"}
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 rounded-xl p-2.5 text-sm font-medium ${msg.ok ? "bg-go-soft text-go-dark" : "bg-red-50 text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
