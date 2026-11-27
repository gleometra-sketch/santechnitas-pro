import DocumentSheet from "@/components/documents/DocumentSheet";
import { SignProvider } from "@/components/documents/SignContext";
import PublicActions from "@/components/documents/PublicActions";
import { getPublicDocument } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dokumentas · DarboRitmas", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function ViesasDokumentas({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getPublicDocument(token);
  if (!doc) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="text-2xl font-extrabold">Dokumentas nerastas</h1>
        <p className="mt-2 text-muted">Nuoroda neteisinga arba nebegalioja. Kreipkitės į dokumentą atsiuntusį asmenį.</p>
      </main>
    );
  }
  const closed = doc.status === "declined" ? "Atsakymas išsaugotas: dokumentas atmestas." : doc.expired ? "Šio pasiūlymo galiojimas pasibaigė. Kreipkitės į dokumentą atsiuntusį asmenį." : null;
  // Atšaukto dokumento turinio nerodome: pasiūlymas atsiimtas (pvz. klaidinga kaina), nuoroda neturi jo atskleisti.
  if (doc.status === "cancelled") {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="text-2xl font-extrabold">Šis dokumentas atšauktas</h1>
        <p className="mt-2 text-muted">Kreipkitės į dokumentą atsiuntusį asmenį dėl naujos versijos.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 print:max-w-none print:p-0">
      {closed && <p className="rounded-2xl bg-amber-50 p-4 font-medium text-amber-800 print:hidden">{closed}</p>}
      <SignProvider>
        <DocumentSheet doc={doc} />
        <PublicActions token={token} kind={doc.kind} canRespond={doc.status === "sent" && !doc.expired} />
      </SignProvider>
    </main>
  );
}
