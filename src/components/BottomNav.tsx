"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Car, Clock, FilePlus2, ListChecks, Package } from "lucide-react";
import { isNavActive } from "@/lib/nav";

type Item = { href: string; label: string; short?: string; Icon: typeof Clock; match?: string };
const items: Item[] = [
  { href: "/darbai", label: "Darbai", Icon: ListChecks },
  { href: "/kalendorius", label: "Kalendorius", short: "Kalend.", Icon: CalendarDays },
  { href: "/valandos", label: "Valandos", Icon: Clock },
];
const materials: Item = { href: "/medziagos", label: "Medžiagos", Icon: Package };
const cars: Item = { href: "/automobiliai", label: "Automobiliai", short: "Auto", Icon: Car };
// Administratoriui: tiesiai į naujos sąmatos kūrimą; aktyvus visuose dokumentų puslapiuose.
const estimate: Item = { href: "/valdymas/dokumentai/naujas?kind=estimate", match: "/valdymas/dokumentai", label: "Sąmata", Icon: FilePlus2 };

export default function BottomNav({ showMaterials = false, showCars = false, showEstimate = false }: { showMaterials?: boolean; showCars?: boolean; showEstimate?: boolean }) {
  const pathname = usePathname();
  const list = [...items, ...(showMaterials ? [materials] : []), ...(showCars ? [cars] : []), ...(showEstimate ? [estimate] : [])];
  const cols = list.length >= 6 ? "grid-cols-6" : list.length === 5 ? "grid-cols-5" : list.length === 4 ? "grid-cols-4" : "grid-cols-3";
  const compact = list.length >= 6; // 6 punktai: smulkesnis šriftas ir trumpesni pavadinimai siaurame ekrane
  return (
    <nav
      aria-label="Pagrindinis meniu"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className={`mx-auto grid max-w-3xl ${cols}`}>
        {list.map(({ href, label, short, match, Icon }) => {
          const active = isNavActive(pathname, href, match);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  compact ? "text-[11px] min-[480px]:text-sm" : "text-xs min-[400px]:text-sm"
                } ${active ? "text-accent" : "text-muted"}`}
              >
                <Icon size={compact ? 24 : 26} strokeWidth={2} aria-hidden />
                {compact && short ? (
                  <>
                    <span className="min-[480px]:hidden">{short}</span>
                    <span className="hidden min-[480px]:inline">{label}</span>
                  </>
                ) : (
                  label
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
