import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionContext } from "@/lib/auth/context";
import { todayKey } from "@/lib/dates";
import { summarizeWork, type DocItem, type Seller } from "./logic";
import type { DocumentDetail, DocumentSummary, PublicDocument } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: unknown) => Number(v ?? 0);
const items = (rows: any[] | null): DocItem[] =>
  (rows ?? []).map((r) => ({ description: r.description, quantity: num(r.quantity), unit: r.unit, unit_price: num(r.unit_price) }));

const SUMMARY = "id, kind, number, title, status, client_name, project_id, total_gross, created_at, sent_at, responded_at";
const toSummary = (d: any): DocumentSummary => ({
  id: d.id, kind: d.kind, number: d.number, title: d.title, status: d.status, clientName: d.client_name, projectId: d.project_id,
  totalGross: num(d.total_gross), createdAt: d.created_at, sentAt: d.sent_at, respondedAt: d.responded_at,
});

/** Tik administratoriui (RLS). */
export async function getDocuments(ctx: SessionContext): Promise<DocumentSummary[]> {
  if (!ctx.company) return [];
  const { data } = await (await createClient()).from("documents").select(SUMMARY).eq("company_id", ctx.company.id).order("created_at", { ascending: false }).limit(300);
  return (data ?? []).map(toSummary);
}

export async function getDocumentDetail(ctx: SessionContext, id: string): Promise<DocumentDetail | null> {
  if (!ctx.company) return null;
  const db = await createClient();
  const { data: d } = await db.from("documents").select("*").eq("id", id).eq("company_id", ctx.company.id).maybeSingle();
  if (!d) return null;
  const [it, ev] = await Promise.all([
    db.from("document_items").select("description, quantity, unit, unit_price").eq("document_id", id).order("position"),
    db.from("document_events").select("event, actor, detail, created_at").eq("document_id", id).order("created_at"),
  ]);
  return {
    ...toSummary(d), estimateId: d.estimate_id, clientEmail: d.client_email, clientPhone: d.client_phone, clientAddress: d.client_address,
    workAddress: d.work_address, vatRate: num(d.vat_rate), validUntil: d.valid_until, notes: d.notes, body: d.body,
    totalNet: num(d.total_net), totalVat: num(d.total_vat), publicToken: d.public_token, respondedName: d.responded_name, responseNote: d.response_note,
    items: items(it.data),
    events: (ev.data ?? []).map((e: any) => ({ event: e.event, actor: e.actor, detail: e.detail, createdAt: e.created_at })),
  };
}

export async function getCompanyProfile(ctx: SessionContext): Promise<Seller & { legal_name: string | null }> {
  const fallback = { legal_name: ctx.company?.name ?? null, code: null, vat_code: null, address: null, phone: null, email: null, iban: null };
  if (!ctx.company) return fallback;
  const { data } = await (await createClient()).from("company_profiles").select("legal_name, code, vat_code, address, phone, email, iban").eq("company_id", ctx.company.id).maybeSingle();
  return data ? { ...data, legal_name: data.legal_name ?? ctx.company.name } : fallback;
}

/** Viešas dokumento vaizdas pagal nuorodos kodą (be sesijos; tik serveris, service_role). Nerodome vidinių laukų. */
export async function getPublicDocument(token: string): Promise<PublicDocument | null> {
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return null;
  const db = createAdminClient();
  const { data: d } = await db.from("documents").select("*").eq("public_token", token).maybeSingle();
  if (!d || d.status === "draft") return null;
  const { data: it } = await db.from("document_items").select("description, quantity, unit, unit_price").eq("document_id", d.id).order("position");
  let estimate: PublicDocument["estimate"] = null;
  if (d.kind === "contract" && d.estimate_id) {
    const { data: e } = await db.from("documents").select("id, number, vat_rate, total_net, total_vat, total_gross").eq("id", d.estimate_id).eq("company_id", d.company_id).maybeSingle();
    if (e) {
      const { data: ei } = await db.from("document_items").select("description, quantity, unit, unit_price").eq("document_id", e.id).order("position");
      estimate = { number: e.number, vatRate: num(e.vat_rate), totalNet: num(e.total_net), totalVat: num(e.total_vat), totalGross: num(e.total_gross), items: items(ei) };
    }
  }
  return {
    kind: d.kind, number: d.number, title: d.title, status: d.status, seller: (d.seller ?? {}) as Seller, clientName: d.client_name,
    clientAddress: d.client_address, workAddress: d.work_address, vatRate: num(d.vat_rate), validUntil: d.valid_until, notes: d.notes, body: d.body,
    totalNet: num(d.total_net), totalVat: num(d.total_vat), totalGross: num(d.total_gross), items: items(it), estimate,
    sentAt: d.sent_at, respondedAt: d.responded_at, respondedName: d.responded_name,
    expired: d.status === "sent" && !!d.valid_until && d.valid_until < todayKey(),
  };
}

/**
 * Trumpas darbų aprašymas sutarčiai iš sąmatų eilučių. Raktas: dokumento sąmatos id arba „est:<id>“ pagrindinei sąmatai.
 * Pagrindinėje sąmatoje pirmenybė darbams (ne medžiagoms).
 */
export async function getWorkSummaries(ctx: SessionContext, docIds: string[], mainIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!ctx.company) return out;
  const db = await createClient();
  if (docIds.length) {
    const { data } = await db.from("document_items").select("document_id, description, position").eq("company_id", ctx.company.id).in("document_id", docIds.slice(0, 100)).order("position", { ascending: true }).limit(2000);
    const by = new Map<string, string[]>();
    for (const r of (data ?? []) as any[]) by.set(r.document_id, [...(by.get(r.document_id) ?? []), r.description]);
    for (const [id, names] of by) out[id] = summarizeWork(names);
  }
  if (mainIds.length) {
    const { data } = await db.from("estimate_lines").select("estimate_id, kind, name, position").eq("company_id", ctx.company.id).in("estimate_id", mainIds.slice(0, 100)).order("position", { ascending: true }).limit(3000);
    const work = new Map<string, string[]>();
    const all = new Map<string, string[]>();
    for (const r of (data ?? []) as any[]) {
      all.set(r.estimate_id, [...(all.get(r.estimate_id) ?? []), r.name]);
      if (r.kind === "work") work.set(r.estimate_id, [...(work.get(r.estimate_id) ?? []), r.name]);
    }
    for (const id of mainIds) out[`est:${id}`] = summarizeWork(work.get(id) ?? all.get(id) ?? []);
  }
  return out;
}
