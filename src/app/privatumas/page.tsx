import LegalPage, { H2 } from "@/components/legal/LegalPage";
import { getLegal } from "@/lib/legal";

export const metadata = { title: "Privatumo politika · DarboRitmas" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const legal = getLegal();
  const seller = legal.name || "[ĮMONĖS PAVADINIMAS]";
  return (
    <LegalPage title="Privatumo politika" legal={legal}>
      <H2>Kas mes</H2>
      <p>
        Duomenų valdytojas dėl paskyrų, atsiskaitymo ir svetainės naudojimo yra <strong>{seller}</strong>
        {legal.code ? `, įmonės kodas ${legal.code}` : ""}
        {legal.address ? `, ${legal.address}` : ""}. Privatumo klausimais: {legal.email || "[EL. PAŠTAS]"}.
        Dėl duomenų, kuriuos į programą įveda jūsų įmonė apie savo darbuotojus ir klientus (darbo laikas, objektai, pastabos), valdytoja yra jūsų įmonė, o mes esame duomenų tvarkytojas.
      </p>

      <H2>Kokius duomenis tvarkome</H2>
      <p>Vardą, el. paštą, įmonės pavadinimą ir narių vaidmenis; darbo laiko įrašus, pertraukas, objektų adresus, užduotis, pastabas, medžiagų ir automobilių duomenis, sąmatas ir sutartis; jūsų įkeltus failus (nuotraukas, balso įrašus); prenumeratos ir mokėjimų istoriją (be kortelės duomenų); pagrindinius techninius žurnalus (klaidos, saugumas).</p>

      <H2>Tikslai ir teisinis pagrindas</H2>
      <p>Paslaugai teikti ir sutarčiai vykdyti (darbo laiko apskaita, planavimas, medžiagos, dokumentai); prenumeratai ir atsiskaitymui; saugumui ir klaidų taisymui (teisėtas interesas); teisinėms prievolėms vykdyti. Jei naudojame nebūtinus slapukus ar analitiką, tai darome tik gavę sutikimą.</p>

      <H2>Kam duomenis perduodame</H2>
      <p>
        Paslaugų teikėjams, be kurių negalime veikti: <strong>Supabase</strong> (duomenų bazė, failai, prisijungimas), <strong>Cloudflare</strong> (talpinimas ir saugumas), <strong>Paddle</strong> (atsiskaitymas; Paddle yra pardavėjas, Merchant of Record, ir savarankiškas savo gautų asmens duomenų valdytojas, žr. Paddle privatumo politiką), <strong>Telegram</strong> (tik jei administratorius prijungia pranešimus). Taip pat profesionaliems patarėjams ir institucijoms, kai to reikalauja teisė. Duomenų neparduodame.
      </p>
      <p>Kai kurie teikėjai gali tvarkyti duomenis už Europos ekonominės erdvės ribų; tuomet taikomos BDAR numatytos apsaugos priemonės (pvz. standartinės sutarčių sąlygos).</p>

      <H2>Kiek saugome</H2>
      <p>Duomenis saugome, kol turite paskyrą ir naudojatės Paslauga. Paprašius ištriname, išskyrus tuos, kuriuos privalome saugoti pagal teisės aktus (pvz. apskaitos dokumentus, kuriuos saugo ir Paddle).</p>

      <H2>Jūsų teisės</H2>
      <p>Galite prašyti peržiūrėti, ištaisyti, ištrinti, apriboti tvarkymą, perkelti duomenis, nesutikti su tvarkymu ir atšaukti sutikimą. Į prašymą atsakome per vieną mėnesį. Skundą galite pateikti Valstybinei duomenų apsaugos inspekcijai. Darbuotojai savo teisėmis dėl darbo duomenų pirmiausia kreipiasi į savo darbdavį (valdytoją).</p>

      <H2>Saugumas</H2>
      <p>Naudojame prieigos kontrolę pagal įmones ir vaidmenis, šifruotą ryšį (HTTPS) ir atskirtus slaptus raktus. Jokia sistema nėra visiškai nepažeidžiama, todėl apie incidentus pranešime, kaip reikalauja teisė.</p>

      <H2>Slapukai</H2>
      <p>Naudojame būtinus slapukus ir naršyklės saugyklą prisijungimui ir programos veikimui. Nebūtinų (reklamos, analitikos) slapukų be sutikimo nenaudojame.</p>
    </LegalPage>
  );
}
