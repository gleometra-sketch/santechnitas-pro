import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOutbox } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Kasdienis darbas (pvz. 07:00): sukuria automobilių priminimus ir iškart išsiunčia eilę. */
async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("car_reminders_run");
    if (error) throw new Error(error.message);
    const dispatched = await dispatchOutbox(admin);
    return NextResponse.json({ enqueued: data ?? 0, dispatched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "klaida" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
