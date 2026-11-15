import Link from "next/link";
import { Settings } from "lucide-react";
import Logo from "./Logo";
import NotificationBell from "./notifications/NotificationBell";
import UserMenu from "./UserMenu";

export default function AppHeader({ name, company, admin = false }: { name: string; company?: string; admin?: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-navy pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/darbai" aria-label="DarboRitmas – Darbai" className="shrink-0">
          <Logo size={36} variant="dark" wordmarkClassName="hidden min-[420px]:inline" />
        </Link>
        <div className="flex items-center gap-2">
          {admin && (
            <Link
              href="/valdymas"
              aria-label="Valdymas"
              className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-white/30 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:px-3"
            >
              <Settings size={20} aria-hidden /> <span className="hidden sm:inline">Valdymas</span>
            </Link>
          )}
          <NotificationBell />
          <UserMenu name={name} company={company} />
        </div>
      </div>
    </header>
  );
}
