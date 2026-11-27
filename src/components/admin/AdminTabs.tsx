"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/valdymas/darbai", icon: "darbai" as const, label: "Darbai" },
  { href: "/valdymas/objektai", icon: "objektai" as const, label: "Objektai" },
  { href: "/valdymas/darbuotojai", icon: "darbuotojai" as const, label: "Darbuotojai" },
  { href: "/valdymas/laikas", icon: "laikas" as const, label: "Laikas" },
  { href: "/valdymas/ataskaita", icon: "ataskaita" as const, label: "Ataskaita" },
  { href: "/valdymas/dokumentai", icon: "dokumentai" as const, label: "Dokumentai" },
  { href: "/valdymas/automobiliai", icon: "automobiliai" as const, label: "Automobiliai" },
  { href: "/valdymas/telegram", icon: "telegram" as const, label: "Telegram" },
  { href: "/valdymas/abonementas", icon: "abonementas" as const, label: "Abonementas" },
];

// Paprastos linijinės ikonos (Lucide stiliaus), po vieną kiekvienai skilčiai.
const ICONS = {
  darbai: <><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  objektai: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  darbuotojai: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  laikas: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  ataskaita: <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  dokumentai: <><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="M8 12h8" /><path d="M8 16h5" /></>,
  automobiliai: <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>,
  telegram: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></>,
  abonementas: <><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></>,
};

export default function AdminTabs() {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };

  // Aktyvus skirtukas pastumiamas į vidurį, o krašte šviesėjantis šešėlis rodo, kad yra daugiau skirtukų.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
    measure();
  }, [pathname]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div className="relative rounded-2xl bg-white shadow-card">
      <nav
        ref={scroller}
        onScroll={measure}
        aria-label="Valdymo skiltys"
        className="flex gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:p-2"
      >
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              ref={active ? activeRef : undefined}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 shrink-0 grow items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold sm:grow-0 ${active ? "border-navy bg-navy text-white" : t.href.endsWith("/telegram") ? "border-[#229ED9]/50 bg-[#229ED9]/10 text-[#1a86b8]" : "border-black/15 text-muted hover:bg-black/[0.03]"}`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className={`mr-2 h-5 w-5 shrink-0 ${t.href.endsWith("/telegram") ? (active ? "text-[#4cc3f5]" : "text-[#229ED9]") : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[t.icon]}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {edge.left && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:hidden rounded-l-2xl bg-gradient-to-r from-white to-transparent" />}
      {edge.right && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:hidden rounded-r-2xl bg-gradient-to-l from-white to-transparent" />}
    </div>
  );
}
