import AuthShell from "@/components/auth/AuthShell";

export default function NotConfigured() {
  return (
    <AuthShell title="Reikia sujungti duomenų bazę" subtitle="Programa dar neprijungta prie Supabase.">
      <ol className="list-decimal space-y-2 pl-5">
        <li>Sukurkite Supabase projektą ir paleiskite migracijas (<code>docs/DUOMENU-BAZE.md</code>).</li>
        <li>Nukopijuokite <code>.env.example</code> į <code>.env.local</code> ir įrašykite <code>NEXT_PUBLIC_SUPABASE_URL</code> bei <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
        <li>Sustabdykite (<code>Ctrl + C</code>) ir iš naujo paleiskite <code>npm run dev</code>.</li>
      </ol>
    </AuthShell>
  );
}
