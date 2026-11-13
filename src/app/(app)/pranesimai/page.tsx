import NotificationSettings from "@/components/notifications/NotificationSettings";
import TelegramConnect from "@/components/notifications/TelegramConnect";
import { requireContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function PranesimaiPage() {
  await requireContext();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Pranešimai</h1>
      <TelegramConnect />
      <div className="rounded-2xl bg-white p-4 shadow-card"><NotificationSettings /></div>
    </div>
  );
}
