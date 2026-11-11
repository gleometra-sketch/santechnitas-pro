import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENTS, type EventType } from "./events";
import { notify } from "./notify";

type OutboxRow = {
  id: number; company_id: string; user_id: string; event_type: string;
  title: string; body: string; data: Record<string, unknown>;
};

/** Paima eilės įvykius (notification_outbox), išsiunčia kanalais ir pažymi apdorotais. */
export async function dispatchOutbox(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase.rpc("claim_notification_outbox", { p_limit: limit });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as OutboxRow[];
  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (!(row.event_type in EVENTS)) throw new Error(`Nežinomas įvykis: ${row.event_type}`);
      await notify(supabase, {
        companyId: row.company_id,
        userId: row.user_id,
        event: row.event_type as EventType,
        payload: { title: row.title, body: row.body, data: row.data },
      });
      await supabase.from("notification_outbox")
        .update({ processed_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      ok++;
    } catch (e) {
      failed++;
      await supabase.from("notification_outbox")
        .update({ last_error: e instanceof Error ? e.message.slice(0, 500) : "klaida" }).eq("id", row.id);
    }
  }
  return { claimed: rows.length, ok, failed };
}
