"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
};

/** Telefone: vardas, įmonė, pranešimų nustatymai ir „Atsijungti“ – viename meniu, kad viršutinė juosta netilptų į vieną eilutę. */
export default function UserMenu({ name, company }: { name: string; company?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Paskyros meniu: ${name}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        {initials(name)}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 overflow-hidden rounded-2xl border border-black/10 bg-white text-ink shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
          <div className="border-b border-black/10 px-4 py-3">
            <p className="truncate font-semibold">{name}</p>
            {company && <p className="truncate text-sm text-muted">{company}</p>}
          </div>
          <Link href="/pranesimai" className="flex min-h-12 items-center gap-3 px-4 font-medium">
            <Bell size={18} aria-hidden /> Pranešimų nustatymai
          </Link>
          <form action={signOut} className="border-t border-black/10">
            <button className="flex min-h-12 w-full items-center gap-3 px-4 text-left font-medium text-danger">
              <LogOut size={18} aria-hidden /> Atsijungti
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
