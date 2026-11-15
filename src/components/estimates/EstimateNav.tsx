import Link from "next/link";

const TABS = [
  { href: "/samata", label: "Sąmatos", id: "list" },
  { href: "/samata/katalogas", label: "Katalogas", id: "catalog" },
] as const;

export default function EstimateNav({ active }: { active: "list" | "catalog" }) {
  return (
    <nav aria-label="Sąmatos" className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-card">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          className={`flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold ${active === t.id ? "bg-navy text-white" : "text-muted"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
