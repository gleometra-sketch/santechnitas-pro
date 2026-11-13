"use client";

import { useState, useTransition } from "react";
import { disconnectTelegram, createTelegramLink } from "@/lib/telegram/actions";
import { ghostBtn, Msg, primaryBtn } from "./ui";

type Props = { connected: boolean; username: string | null; categories: { id: string; label: string }[] };

export default function TelegramConnect({ connected, username, categories }: Props) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url: string; minutes: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const connect = () =>
    start(async () => {
      setMsg(null);
      const r = await createTelegramLink();
      if (r.ok) setLink({ url: r.url, minutes: r.minutes });
      else setMsg({ ok: false, text: r.error });
    });

  const disconnect = () =>
    start(async () => {
      const r = await disconnectTelegram();
      setLink(null);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Atjungta." } : { ok: false, text: r.error });
    });

  return (
    <section className="space-y-4 rounded-card bg-white p-5 shadow-card">
      <div>
        <h2 className="text-xl font-extrabold">Telegram pranešimai</h2>
        <p className="mt-1 text-muted">Gaukite pranešimus telefone, kai darbuotojai pateikia medžiagų poreikį, pastabą ar pradeda / baigia darbą.</p>
      </div>

      {connected ? (
        <div className="space-y-3">
          <p className="rounded-2xl bg-go-soft p-3 font-medium text-go-dark">✅ Prijungta{username ? ` (@${username})` : ""}</p>
          <button type="button" onClick={disconnect} disabled={pending} className={ghostBtn}>
            Atjungti
          </button>
        </div>
      ) : link ? (
        <div className="space-y-3">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={`${primaryBtn} flex items-center justify-center`}>
            Atidaryti Telegram ir paspausti „Start“
          </a>
          <p className="text-sm text-muted">Nuoroda vienkartinė ir galioja {link.minutes} min. Paspaudę „Start“ botui, grįžkite čia ir atnaujinkite puslapį.</p>
        </div>
      ) : (
        <button type="button" onClick={connect} disabled={pending} className={primaryBtn}>
          {pending ? "Kuriama…" : "Prijungti Telegram"}
        </button>
      )}

      <Msg msg={msg} />

      <div className="border-t border-black/10 pt-4">
        <p className="mb-2 text-sm font-medium text-muted">Kategorijas keičiate botui parašę /pranesimai</p>
        <ul className="space-y-1 text-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <code className="rounded bg-black/5 px-1.5 py-0.5">{c.id}</code> – {c.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
