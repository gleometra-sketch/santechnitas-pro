"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, ListChecks, Package } from "lucide-react";

const items = [
  { href: "/darbai", label: "Darbai", Icon: ListChecks },
  { href: "/kalendorius", label: "Kalendorius", Icon: CalendarDays },
  { href: "/valandos", label: "Valandos", Icon: Clock },
];
const adminItems = [...items, { href: "/medziagos", label: "Medžiagos", Icon: Package }];

export default function BottomNav({ showMaterials = false }: { showMaterials?: boolean }) {
  const pathname = usePathname();
  const list = showMaterials ? adminItems : items;
  return (
    <nav
      aria-label="Pagrindinis meniu"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className={`mx-auto grid max-w-3xl ${showMaterials ? "grid-cols-4" : "grid-cols-3"}`}>
        {list.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={26} strokeWidth={2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
