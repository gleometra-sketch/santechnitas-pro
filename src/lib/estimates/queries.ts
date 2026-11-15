import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { totalsFromSubtotal, type LineKind } from "./calc";
import { isStatus, type CatalogRow, type EstimateFull, type EstimateListRow, type EstimateStatus, type ProjectOption } from "./types";

const toHundredths = (v: number | string) => Math.round(Number(v) * 100);

/** Sąmatų sąrašas su galutine suma (su nuolaida ir PVM). RLS: tik administratorius. */
export async function getEstimateList(ctx: SessionContext): Promise<{ rows: EstimateListRow[]; error: string | null }> {
  if (!ctx.company) return { rows: [], error: null };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, number, title, client_name, status, vat_percent, discount_percent, created_at")
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { rows: [], error: error.message };
  const list = data ?? [];
  if (list.length === 0) return { rows: [], error: null };

  const { data: subs, error: subErr } = await supabase
    .from("estimate_subtotals")
    .select("estimate_id, subtotal_cents")
    .in("estimate_id", list.map((e) => e.id));
  if (subErr) return { rows: [], error: subErr.message };
  const subtotal = new Map((subs ?? []).map((s) => [s.estimate_id as string, Number(s.subtotal_cents)]));

  const rows = list.map((e) => ({
    id: e.id as string,
    number: e.number as string,
    title: (e.title as string) ?? "",
    clientName: (e.client_name as string | null) ?? null,
    status: (isStatus(e.status) ? e.status : "draft") as EstimateStatus,
    createdAt: e.created_at as string,
    totalCents: totalsFromSubtotal(subtotal.get(e.id) ?? 0, toHundredths(e.discount_percent), toHundredths(e.vat_percent)).total,
  }));
  return { rows, error: null };
}

export async function getEstimate(ctx: SessionContext, id: string): Promise<EstimateFull | null> {
  if (!ctx.company) return null;
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("estimates")
    .select("id, number, title, project_id, client_name, client_phone, client_email, address, status, vat_percent, discount_percent, valid_until, notes")
    .eq("id", id)
    .eq("company_id", ctx.company.id)
    .maybeSingle();
  if (!e) return null;
  const { data: lines } = await supabase
    .from("estimate_lines")
    .select("id, kind, name, unit, quantity, unit_price_cents")
    .eq("estimate_id", id)
    .order("position", { ascending: true })
    .limit(300);
  return {
    id: e.id,
    number: e.number,
    title: e.title ?? "",
    projectId: e.project_id ?? null,
    clientName: e.client_name ?? "",
    clientPhone: e.client_phone ?? "",
    clientEmail: e.client_email ?? "",
    address: e.address ?? "",
    status: isStatus(e.status) ? e.status : "draft",
    vatHundredths: toHundredths(e.vat_percent),
    discountHundredths: toHundredths(e.discount_percent),
    validUntil: e.valid_until ?? "",
    notes: e.notes ?? "",
    lines: (lines ?? []).map((l) => ({
      id: l.id as string,
      kind: l.kind as LineKind,
      name: l.name as string,
      unit: l.unit as string,
      qtyMilli: Math.round(Number(l.quantity) * 1000),
      priceCents: Number(l.unit_price_cents),
    })),
  };
}

const PAGE = 1000; // Supabase vienu kartu grąžina daugiausia 1000 eilučių
const MAX_PAGES = 5;

/** Visas įmonės katalogas (naujausi pirma). Skaitomas puslapiais, kad nebūtų tyliai apkarpytas. */
export async function getCatalog(ctx: SessionContext): Promise<{ rows: CatalogRow[]; truncated: boolean; error: string | null }> {
  if (!ctx.company) return { rows: [], truncated: false, error: null };
  const supabase = await createClient();
  const rows: CatalogRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from("estimate_catalog")
      .select("id, kind, name, unit, unit_price_cents, last_used_at")
      .eq("company_id", ctx.company.id)
      .order("last_used_at", { ascending: false })
      .order("id", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { rows, truncated: false, error: error.message };
    for (const r of data ?? []) {
      rows.push({ id: r.id, kind: r.kind as LineKind, name: r.name, unit: r.unit, priceCents: Number(r.unit_price_cents), lastUsedAt: r.last_used_at });
    }
    if ((data ?? []).length < PAGE) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}

export async function getProjectOptions(ctx: SessionContext): Promise<ProjectOption[]> {
  if (!ctx.company) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, address, client_name, client_phone, client_email")
    .eq("company_id", ctx.company.id)
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []).map((p) => ({
    id: p.id, name: p.name, address: p.address ?? null, clientName: p.client_name ?? null, clientPhone: p.client_phone ?? null, clientEmail: p.client_email ?? null,
  }));
}
