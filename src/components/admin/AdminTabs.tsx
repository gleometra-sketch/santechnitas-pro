"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/valdymas/darbai", label: "Darbai" },
  { href: "/valdymas/objektai", label: "Objektai" },
  { href: "/valdymas/darbuotojai", label: "Darbuotojai" },
  { href: "/valdymas/laikas", label: "Laikas" },
  { href: "/valdymas/ataskaita", label: "Ataskaita" },
  { href: "/valdymas/dokumentai", label: "Dokumentai" },
  { href: "/valdymas/automobiliai", label: "Automobiliai" },
  { href: "/valdymas/telegram", label: "Telegram" },
  { href: "/valdymas/abonementas", label: "Abonementas" },
];

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
        className="flex gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
      >
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              ref={active ? activeRef : undefined}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 shrink-0 grow items-center justify-center rounded-xl px-4 text-center text-sm font-semibold ${active ? "bg-navy text-white" : "text-muted"}`}
            >
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
