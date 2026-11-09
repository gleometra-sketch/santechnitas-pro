import Link from "next/link";
import Logo from "../Logo";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="bg-navy pb-16 pt-[max(2rem,env(safe-area-inset-top))] text-center">
        <Link href="/" className="inline-flex" aria-label="DarboRitmas – pradžia">
          <Logo size={64} variant="dark" />
        </Link>
      </div>
      <main className="mx-auto -mt-10 max-w-md px-4 pb-10">
        <div className="rounded-card bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
