import Link from "next/link";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import { isAdmin, requireContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function PranesimaiPage() {
  const ctx = await requireContext();
  const admin = isAdmin(ctx.role);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Pranešimai</h1>
      {admin && (
        <p className="rounded-2xl bg-white p-4 text-sm shadow-card">
          Telegram pranešimus (medžiagos, pastabos, darbo pradžia, automobiliai, sąmatos ir sutartys) prijungiate skiltyje{" "}
          <Link href="/valdymas/telegram" className="font-semibold text-accent underline">Valdymas → Telegram</Link>.
        </p>
      )}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <NotificationSettings isAdmin={admin} />
      </div>
    </div>
  );
}
