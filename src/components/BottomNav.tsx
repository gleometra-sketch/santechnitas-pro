"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Calculator, Car, Clock, ListChecks, Package } from "lucide-react";

// „short“ – trumpa etiketė siauram ekranui (kad penkios skiltys tilptų į vieną eilutę).
const items = [
  { href: "/darbai", label: "Darbai", Icon: ListChecks },
  { href: "/kalendorius", label: "Kalendorius", short: "Kalend.", Icon: CalendarDays },
  { href: "/valandos", label: "Valandos", Icon: Clock },
];
const materials = { href: "/medziagos", label: "Medžiagos", Icon: Package };
const cars = { href: "/automobiliai", label: "Automobiliai", short: "Auto", Icon: Car };
const estimates = { href: "/samata", label: "Sąmata", Icon: Calculator };

const TEXT_FIELD = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]), textarea, select";

export default function BottomNav({ showMaterials = false, showCars = false, showEstimates = false }: { showMaterials?: boolean; showCars?: boolean; showEstimates?: boolean }) {
  const pathname = usePathname();
  const [typing, setTyping] = useState(false);

  // Telefone, kai atsidaro klaviatūra, meniu paslepiamas – kad neužimtų vietos virš klaviatūros.
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

  const list: { href: string; label: string; short?: string; Icon: typeof ListChecks }[] = [...items, ...(showMaterials ? [materials] : []), ...(showCars ? [cars] : []), ...(showEstimates ? [estimates] : [])];
  const cols = list.length >= 6 ? "grid-cols-6" : list.length === 5 ? "grid-cols-5" : list.length === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <nav
      aria-label="Pagrindinis meniu"
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] ${typing ? "hidden" : ""}`}
    >
      <ul className={`mx-auto grid max-w-3xl ${cols}`}>
        {list.map(({ href, label, short, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:text-sm ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={24} strokeWidth={2} aria-hidden />
                {short ? (
                  <>
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
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
