import Link from "next/link";

export const metadata = { title: "Privatumo politika · DarboRitmas" };

// ŠABLONAS: prieš viešą paleidimą papildykite įmonės duomenimis ir peržiūrėkite su teisininku.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <p className="rounded-2xl bg-accent-soft p-3 text-sm">
        Šablonas. Prieš paleidžiant programą klientams įrašykite duomenų valdytojo rekvizitus ir peržiūrėkite tekstą su teisininku.
      </p>
      <h1 className="text-3xl font-extrabold">Privatumo politika</h1>
      <h2 className="text-xl font-bold">Kokius duomenis saugome</h2>
      <p>Vardą, el. paštą, įmonės pavadinimą, darbo laiko įrašus, pertraukas, objektų adresus, pastabas, jūsų įkeltus failus (nuotraukas, balso įrašus) ir mokėjimų istoriją.</p>
      <h2 className="text-xl font-bold">Kam jų reikia</h2>
      <p>Paslaugai teikti: darbo laiko apskaitai, darbų planavimui, medžiagų užsakymams ir prenumeratos valdymui.</p>
      <h2 className="text-xl font-bold">Kas apdoroja duomenis</h2>
      <p>Duomenys saugomi Supabase (duomenų bazė ir failai), mokėjimus apdoroja Stripe. Banko kortelės duomenų mes nematome ir nesaugome.</p>
      <h2 className="text-xl font-bold">Jūsų teisės</h2>
      <p>Galite prašyti peržiūrėti, ištaisyti, eksportuoti ar ištrinti savo duomenis. Duomenų valdytojo kontaktai: [įrašykite].</p>
      <p><Link href="/registracija" className="font-semibold text-accent-dark underline">Grįžti</Link></p>
    </main>
  );
}
