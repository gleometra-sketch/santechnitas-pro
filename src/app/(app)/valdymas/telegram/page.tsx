import TelegramConnect from "@/components/admin/TelegramConnect";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/telegram/core";

export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  // RLS: naudotojas mato tik savo prijungimą.
  const { data } = await supabase
    .from("telegram_links")
    .select("telegram_username")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.company?.id ?? "")
    .maybeSingle();
  return (
    <TelegramConnect
      connected={!!data}
      username={data?.telegram_username ?? null}
      categories={Object.entries(CATEGORIES).map(([id, label]) => ({ id, label }))}
    />
  );
}
