import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { addDays, dayStartIso, todayKey } from "@/lib/dates";
import type { AdminMaterialItem, MaterialFilters, MaterialOptions, MaterialSummary } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] : v);
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const ITEM_SELECT =
  "id, request_id, material_name, quantity, unit, status, purchased_by, purchased_at, created_at, material_requests!inner(id, employee_id, project_id, comment, created_at, project:projects(name, address))";

/** Įmonės darbuotojų vardai (RLS leidžia matyti tos pačios įmonės profilius). */
const nameMap = cache(async (ctx: SessionContext) => {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", ctx.company!.id)
    .eq("status", "active");
  const ids = (members ?? []).map((m: any) => m.user_id as string);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    for (const p of profiles ?? []) names.set(p.id, p.full_name?.trim() || p.email);
  }
  return { ids, names };
});

export async function getMaterialOptions(ctx: SessionContext): Promise<MaterialOptions> {
  const supabase = await createClient();
  const [{ ids, names }, projects] = await Promise.all([
    nameMap(ctx),
    supabase.from("projects").select("id, name, address").eq("company_id", ctx.company!.id).order("name").limit(500),
  ]);
  return {
    employees: ids.map((id) => ({ id, name: names.get(id) ?? "Darbuotojas" })).sort((a, b) => a.name.localeCompare(b.name, "lt")),
    projects: (projects.data ?? []) as MaterialOptions["projects"],
  };
}

/** Suvestinė visai įmonei (nepriklauso nuo filtrų). */
export async function getMaterialSummary(ctx: SessionContext): Promise<MaterialSummary> {
  const supabase = await createClient();
  const cid = ctx.company!.id;
  const count = { count: "exact", head: true } as const;
  const today = todayKey();
  const [missing, purchased, open, recent] = await Promise.all([
    supabase.from("material_request_items").select("id", count).eq("company_id", cid).eq("status", "needed"),
    supabase.from("material_request_items").select("id", count).eq("company_id", cid).eq("status", "purchased"),
    supabase.from("material_requests").select("id", count).eq("company_id", cid).eq("status", "open"),
    supabase.from("material_requests").select("id", count).eq("company_id", cid).gte("created_at", dayStartIso(today)),
  ]);
  return {
    missingItems: missing.count ?? 0,
    purchasedItems: purchased.count ?? 0,
    openRequests: open.count ?? 0,
    requestsToday: recent.count ?? 0,
  };
}

export async function getAdminMaterials(ctx: SessionContext, f: MaterialFilters): Promise<{ items: AdminMaterialItem[]; truncated: boolean }> {
  const supabase = await createClient();
  const LIMIT = 500;
  let q = supabase.from("material_request_items").select(ITEM_SELECT).eq("company_id", ctx.company!.id);

  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.employeeId) q = q.eq("material_requests.employee_id", f.employeeId);
  if (f.projectId) q = q.eq("material_requests.project_id", f.projectId);
  if (f.material) q = q.ilike("material_name", `%${escapeLike(f.material)}%`);
  if (f.from) q = q.gte("material_requests.created_at", dayStartIso(f.from));
  if (f.to) q = q.lt("material_requests.created_at", dayStartIso(addDays(f.to, 1)));

  q = f.status === "purchased"
    ? q.order("purchased_at", { ascending: false, nullsFirst: false })
    : q.order("created_at", { ascending: false });

  const [{ data }, { names }] = await Promise.all([q.limit(LIMIT + 1), nameMap(ctx)]);
  const rows = (data ?? []) as any[];

  const items: AdminMaterialItem[] = rows.slice(0, LIMIT).map((r) => {
    const req = one(r.material_requests);
    const project = one(req?.project);
    return {
      id: r.id,
      requestId: r.request_id,
      name: r.material_name,
      quantity: Number(r.quantity),
      unit: r.unit,
      purchased: r.status === "purchased",
      purchasedAt: r.purchased_at,
      purchasedByName: r.purchased_by ? names.get(r.purchased_by) ?? null : null,
      requestedAt: req?.created_at ?? r.created_at,
      employeeName: names.get(req?.employee_id) ?? "Buvęs darbuotojas",
      projectName: project?.name ?? null,
      projectAddress: project?.address ?? null,
      comment: req?.comment ?? null,
    };
  });
  return { items, truncated: rows.length > LIMIT };
}
