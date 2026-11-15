"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelDocument, deleteDocument, duplicateDocument } from "@/lib/documents/actions";
import { KIND_LABEL, STATUS_LABEL, STATUS_STYLE, eur } from "@/lib/documents/logic";
import type { DocumentDetail } from "@/lib/documents/types";
import { Msg, ghostBtn } from "@/components/admin/ui";
import SharePanel from "./SharePanel";

const EVENT_LABEL: Record<string, string> = { sent: "Išsiųsta klientui", approved: "Klientas patvirtino", declined: "Klientas atmetė", cancelled: "Atšaukta" };
const stamp = (iso: string) => new Date(iso).toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Vilnius" });

export default function DocumentStatusPanel({ doc, url, projectName }: { doc: DocumentDetail; url: string | null; projectName: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>, after?: (id?: string) => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Atlikta." } : { ok: false, text: r.error ?? "Klaida." });
      if (r.ok) after?.(r.id);
    });
  const canDelete = ["draft", "cancelled", "declined"].includes(doc.status);

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted">{KIND_LABEL[doc.kind]} Nr. {doc.number}</p>
            <h2 className="text-2xl font-bold">{doc.title}</h2>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[doc.status]}`}>{STATUS_LABEL[doc.status]}</span>
        </div>
        <p>{doc.clientName}{projectName ? ` · ${projectName}` : ""}</p>
        <p className="text-xl font-bold">{eur(doc.totalGross)} <span className="text-sm font-normal text-muted">su PVM</span></p>
        {doc.status === "approved" && <p className="rounded-xl bg-go-soft p-3 font-medium text-go-dark">Patvirtino {doc.respondedName ?? doc.clientName}{doc.respondedAt ? `, ${stamp(doc.respondedAt)}` : ""}.{doc.responseNote ? ` Pastaba: ${doc.responseNote}` : ""}</p>}
        {doc.status === "declined" && <p className="rounded-xl bg-red-50 p-3 font-medium text-danger">Klientas atmetė{doc.respondedAt ? `, ${stamp(doc.respondedAt)}` : ""}.{doc.responseNote ? ` Priežastis: ${doc.responseNote}` : ""}</p>}
      </section>

      {url && ["sent", "approved", "declined"].includes(doc.status) && (
        <>
          {doc.status === "sent" && <SharePanel url={url} kind={doc.kind} number={doc.number} clientName={doc.clientName} email={doc.clientEmail} phone={doc.clientPhone} />}
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center`}>Atidaryti kaip klientas (ir spausdinti / PDF)</a>
        </>
      )}

      <Msg msg={msg} />
      <div className="flex flex-wrap gap-3">
        {doc.kind === "estimate" && ["sent", "approved"].includes(doc.status) && (
          <Link href={`/valdymas/dokumentai/naujas?kind=contract&from=${doc.id}`} className={`${ghostBtn} flex items-center`}>Sukurti sutartį iš šios sąmatos</Link>
        )}
        {doc.status === "sent" && <button disabled={pending} onClick={() => { if (confirm("Atšaukti dokumentą? Klientas nebegalės jo patvirtinti.")) run(() => cancelDocument(doc.id), () => router.refresh()); }} className={ghostBtn}>Atšaukti</button>}
        <button disabled={pending} onClick={() => run(() => duplicateDocument(doc.id), (id) => id && router.push(`/valdymas/dokumentai/${id}`))} className={ghostBtn}>Kopijuoti kaip naują juodraštį</button>
        {canDelete && <button disabled={pending} onClick={() => { if (confirm("Ištrinti šį dokumentą?")) run(() => deleteDocument(doc.id), () => router.push("/valdymas/dokumentai")); }} className={`${ghostBtn} text-danger`}>Ištrinti</button>}
      </div>

      {doc.events.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-card">
          <h3 className="mb-2 text-lg font-bold">Istorija</h3>
          <ul className="space-y-1 text-sm">
            {doc.events.map((e, i) => <li key={i}>{stamp(e.createdAt)} · {EVENT_LABEL[e.event] ?? e.event}{e.actor ? ` (${e.actor})` : ""}{e.detail ? `: ${e.detail}` : ""}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
