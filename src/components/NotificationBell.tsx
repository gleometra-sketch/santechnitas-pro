"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  title: string;
  body: string;
  event_type: string;
  read_at: string | null;
  created_at: string;
};

function ago(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("lt", { numeric: "auto" });
  if (abs < 60) return "ką tik";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

export default function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, event_type, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (list.error || count.error) return setError(true);
    setError(false);
    setItems((list.data ?? []) as Item[]);
    setUnread(count.count ?? 0);
  }, [supabase]);

  // Naudotojas ir pirmas įkėlimas
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    load();
    // Naujas pranešimas -> perkrauti sąrašą (RLS leidžia matyti tik savo)
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  // Uždaryti paspaudus šalia arba Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target || target.read_at) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: now } : i)));
    setUnread((n) => Math.max(0, n - 1));
    const { error: err } = await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    if (err) load();
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? now })));
    setUnread(0);
    const { error: err } = await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
    if (err) load();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Pranešimai, neskaitytų: ${unread}` : "Pranešimai"}
        aria-expanded={open}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <Bell size={20} aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#D92D20] px-1 text-xs font-bold leading-5 text-white ring-2 ring-navy">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2">
            <h2 className="font-display text-base font-bold">Pranešimai</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="min-h-11 text-sm font-medium text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Pažymėti visus skaitytais
              </button>
            )}
          </div>

          {error && <p role="alert" className="px-4 py-3 text-sm text-[#B42318]">Nepavyko įkelti pranešimų. Bandykite dar kartą.</p>}

          {!error && items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">Pranešimų kol kas nėra.</p>
          )}

          <ul className="max-h-[60dvh] overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`block min-h-11 w-full border-b border-black/10 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    n.read_at ? "" : "bg-black/5"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className={`text-sm ${n.read_at ? "font-normal" : "font-semibold"}`}>{n.title}</span>
                    <span className="shrink-0 text-xs text-muted">{ago(n.created_at)}</span>
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                </button>
              </li>
            ))}
          </ul>

          <Link
            href="/nustatymai/pranesimai"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center justify-center text-sm font-medium text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Pranešimų nustatymai
          </Link>
        </div>
      )}
    </div>
  );
}
