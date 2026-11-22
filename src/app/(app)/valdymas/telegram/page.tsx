import TelegramConnect from "@/components/admin/TelegramConnect";
import UpgradeNotice from "@/components/plans/UpgradeNotice";
import UsageMeter from "@/components/plans/UsageMeter";
import { requireContext } from "@/lib/auth/context";
import { canUse } from "@/lib/plans";
import { getPlanUsage } from "@/lib/plans-usage";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/telegram/core";

export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  const ctx = await requireContext();
  if (!canUse(ctx.plan, "telegram")) return <UpgradeNotice feature="telegram" admin />;
  const usage = await getPlanUsage(ctx);
  const supabase = await createClient();
  // RLS: naudotojas mato tik savo prijungimą.
  const { data } = await supabase
    .from("telegram_links")
    .select("telegram_username")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.company?.id ?? "")
    .maybeSingle();
  return (
    <div className="space-y-4">
      {usage && usage.telegram.limit > 0 && (
        <section className="rounded-2xl bg-white p-3 shadow-card">
          <UsageMeter label="Telegram žinutės šį mėnesį" used={usage.telegram.used} limit={usage.telegram.limit} hard={usage.telegram.hard} />
          <p className="mt-2 text-xs text-muted">
            Viena žinutė = vienas gavėjas. {usage.telegram.hard ? "Pasiekus 80 % sustoja darbo pradžios ir pabaigos žinutės, pasiekus 100 % visos." : "Naudojimo neribojame; riba tik sąžiningam naudojimui."} Programos varpelis veikia visada.
          </p>
        </section>
      )}
      <TelegramConnect
        connected={!!data}
        username={data?.telegram_username ?? null}
        categories={Object.entries(CATEGORIES).map(([id, label]) => ({ id, label }))}
      />
    </div>
  );
}
