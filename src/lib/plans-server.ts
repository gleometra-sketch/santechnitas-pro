import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { canUse, isPlanId, type Feature, type PlanId } from "@/lib/plans";

/** Įmonės planas iš duomenų bazės (company_plan). Nesėkmės atveju (pvz. 0022 migracija dar nepaleista) grąžina Pro, kad programa nenustotų veikti. */
export async function getCompanyPlan(db: SupabaseClient, companyId: string): Promise<PlanId | null> {
  const { data, error } = await db.rpc("company_plan", { cid: companyId });
  if (error) {
    console.error("company_plan:", error.message);
    return "pro";
  }
  return isPlanId(data) ? data : null;
}

/** Serverio veiksmams: ar įmonės planas turi funkciją. */
export async function companyHasFeature(companyId: string, feature: Feature, db?: SupabaseClient): Promise<boolean> {
  const client = db ?? (await createClient());
  return canUse(await getCompanyPlan(client, companyId), feature);
}
