"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/valdymas/darbai", label: "Darbai" },
  { href: "/valdymas/objektai", label: "Objektai" },
  { href: "/valdymas/darbuotojai", label: "Darbuotojai" },
  { href: "/valdymas/laikas", label: "Laikas" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Valdymo skiltys" className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-card">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-xl px-1 text-center text-sm font-semibold ${active ? "bg-navy text-white" : "text-muted"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
