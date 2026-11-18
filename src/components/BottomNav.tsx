"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Calculator, Car, Clock, ListChecks, Package } from "lucide-react";
import { isNavActive } from "@/lib/nav";

type Item = { href: string; label: string; short?: string; Icon: typeof Clock; match?: string };
const items: Item[] = [
  { href: "/darbai", label: "Darbai", Icon: ListChecks },
  { href: "/kalendorius", label: "Kalendorius", short: "Kalend.", Icon: CalendarDays },
  { href: "/valandos", label: "Valandos", Icon: Clock },
];
const materials: Item = { href: "/medziagos", label: "Medžiagos", Icon: Package };
const cars: Item = { href: "/automobiliai", label: "Automobiliai", short: "Auto", Icon: Car };
// Administratoriui: sąmatos skaičiuoklė su medžiagų ir darbų katalogu (/samata).
const estimate: Item = { href: "/samata", label: "Sąmata", Icon: Calculator };

const TEXT_FIELD = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]), textarea, select";

export default function BottomNav({ showMaterials = false, showCars = false, showEstimate = false }: { showMaterials?: boolean; showCars?: boolean; showEstimate?: boolean }) {
  const pathname = usePathname();
  // Telefone, kai atsidaro klaviatūra, apatinis meniu paslepiamas (sąmatos išsaugojimo juosta tada nusileidžia į apačią).
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const on = (e: FocusEvent) => setTyping(e.target instanceof HTMLElement && e.target.matches(TEXT_FIELD));
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);
  const list = [...items, ...(showMaterials ? [materials] : []), ...(showCars ? [cars] : []), ...(showEstimate ? [estimate] : [])];
  const cols = list.length >= 6 ? "grid-cols-6" : list.length === 5 ? "grid-cols-5" : list.length === 4 ? "grid-cols-4" : "grid-cols-3";
  const compact = list.length >= 6; // 6 punktai: smulkesnis šriftas ir trumpesni pavadinimai siaurame ekrane
  return (
    <nav
      aria-label="Pagrindinis meniu"
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] ${typing ? "hidden" : ""}`}
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
