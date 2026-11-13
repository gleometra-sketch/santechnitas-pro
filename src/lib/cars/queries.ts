import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import type { CarRow } from "./logic";

const SELECT =
  "id, name, plate, vin, driver_id, active, needs_km, km, km_date, oil_last_km, oil_interval_km, oil_warn_km, reminder_days, inspection_until, road_tax_until, insurance_until";

/** RLS: administratorius gauna visus įmonės automobilius, vairuotojas – tik jam priskirtus. */
export async function getCars(ctx: SessionContext): Promise<CarRow[]> {
  if (!ctx.company) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("cars").select(SELECT).eq("company_id", ctx.company.id).order("name", { ascending: true }).limit(200);
  return (data ?? []) as CarRow[];
}

export type CarAssignmentRow = { carId: string; driverId: string | null; from: string; to: string | null };

export async function getCarAssignments(ctx: SessionContext): Promise<CarAssignmentRow[]> {
  if (!ctx.company) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("car_assignments")
    .select("car_id, driver_id, from_date, to_date")
    .eq("company_id", ctx.company.id)
    .order("from_date", { ascending: false })
    .limit(500);
  return (data ?? []).map((r: { car_id: string; driver_id: string | null; from_date: string; to_date: string | null }) => ({
    carId: r.car_id, driverId: r.driver_id, from: r.from_date, to: r.to_date,
  }));
}
