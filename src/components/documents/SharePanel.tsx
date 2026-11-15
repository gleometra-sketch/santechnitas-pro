"use client";

import { useState } from "react";
import { shareLinks, type DocKind } from "@/lib/documents/logic";
import { ghostBtn } from "@/components/admin/ui";

export default function SharePanel({ url, kind, number, clientName, email, phone }: {
  url: string; kind: DocKind; number: string; clientName: string; email: string | null; phone: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks({ url, kind, number, clientName, email, phone });
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.prompt("Nukopijuokite nuorodą:", url); }
  };
  return (
    <div className="space-y-3 rounded-2xl bg-accent-soft p-4">
      <p className="font-semibold">Nuoroda klientui</p>
      <p className="break-all rounded-xl bg-white p-3 text-sm">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={copy} className={`${ghostBtn} col-span-2 bg-white`}>{copied ? "Nukopijuota" : "Kopijuoti nuorodą"}</button>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center bg-white`}>WhatsApp</a>
        <a href={links.sms} className={`${ghostBtn} flex items-center justify-center bg-white`}>SMS</a>
        <a href={links.mailto} className={`${ghostBtn} col-span-2 flex items-center justify-center bg-white`}>El. paštas</a>
      </div>
      <p className="text-xs text-muted">Kas turi nuorodą, gali peržiūrėti ir patvirtinti dokumentą, todėl siųskite tik klientui.</p>
    </div>
  );
}
