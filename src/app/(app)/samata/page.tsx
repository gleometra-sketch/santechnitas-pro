import Link from "next/link";
import { redirect } from "next/navigation";
import EstimateNav from "@/components/estimates/EstimateNav";
import NewEstimateButton from "@/components/estimates/NewEstimateButton";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { formatEuro } from "@/lib/estimates/calc";
import { getEstimateList } from "@/lib/estimates/queries";
import { STATUSES, STATUS_LABEL, isStatus, type EstimateStatus } from "@/lib/estimates/types";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TONE: Record<EstimateStatus, string> = {
  draft: "bg-surface text-muted",
  sent: "bg-accent-soft text-accent-dark",
  accepted: "bg-go-soft text-go-dark",
  rejected: "bg-red-50 text-danger",
};
const date = new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", dateStyle: "medium" });

export default async function SamataPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  if (!isAdmin(ctx.role)) redirect("/darbai");

  const b = first((await searchParams).b);
  const filter: EstimateStatus | "all" = isStatus(b) ? b : "all";
  const { rows, error } = await getEstimateList(ctx);
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Sąmata</h1>
      <EstimateNav active="list" />
      <NewEstimateButton />

      <nav aria-label="Būsena" className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/samata" : `/samata?b=${s}`}
            aria-current={filter === s ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${filter === s ? "bg-navy text-white" : "bg-white text-muted shadow-card"}`}
          >
            {s === "all" ? "Visos" : STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-danger">Nepavyko nuskaityti sąmatų: {error}</p>}

      {shown.length === 0 && !error ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted shadow-card">
          {rows.length === 0 ? "Sąmatų dar nėra. Paspauskite „Nauja sąmata“ ir pradėkite nuo medžiagų ar darbų." : "Šios būsenos sąmatų nėra."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/samata/${r.id}`} className="block rounded-2xl bg-white p-4 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-muted">{r.number} · {date.format(new Date(r.createdAt))}</p>
                    <p className="break-words text-lg font-extrabold">{r.title || "Be pavadinimo"}</p>
                    {r.clientName && <p className="text-muted">{r.clientName}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold">{formatEuro(r.totalCents)}</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
