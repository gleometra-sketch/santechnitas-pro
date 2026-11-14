import Link from "next/link";
import { Settings } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import Logo from "./Logo";
import NotificationBell from "./notifications/NotificationBell";

export default function AppHeader({ name, company, admin = false }: { name: string; company?: string; admin?: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-navy pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/darbai" aria-label="DarboRitmas – Darbai" className="shrink-0"><Logo size={40} variant="dark" wordmarkClassName="hidden min-[480px]:inline" /></Link>
        <div className="flex min-w-0 items-center gap-3">
          <NotificationBell />
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium">{name}</p>
            {company && <p className="truncate text-xs text-white/70">{company}</p>}
          </div>
          {admin && (
            <Link href="/valdymas" aria-label="Valdymas" className="flex min-h-11 items-center gap-1.5 rounded-xl border border-white/30 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <Settings size={18} aria-hidden /> <span className="hidden sm:inline">Valdymas</span>
            </Link>
          )}
          <form action={signOut}>
            <button className="min-h-11 rounded-xl border border-white/30 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Atsijungti
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
