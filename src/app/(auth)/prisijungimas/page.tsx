import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/Forms";
import { safeNext } from "@/lib/auth/validation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; klaida?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Prisijungimas" subtitle="Darbo laiko ir darbų valdymas.">
      {sp.klaida && (
        <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 font-medium text-danger">
          Nuoroda negalioja arba jau panaudota. Prisijunkite arba paprašykite naujos.
        </p>
      )}
      <LoginForm next={safeNext(sp.next) ?? undefined} />
    </AuthShell>
  );
}
