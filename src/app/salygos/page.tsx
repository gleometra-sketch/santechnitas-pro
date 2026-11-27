import LegalPage, { H2 } from "@/components/legal/LegalPage";
import { REFUND_DAYS, TRIAL_DAYS, getLegal } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Naudojimo sąlygos · DarboRitmas" };
export const dynamic = "force-dynamic"; // rekvizitai skaitomi vykdymo metu iš aplinkos kintamųjų

export default function TermsPage() {
  const legal = getLegal();
  const seller = legal.name || "[ĮMONĖS PAVADINIMAS]";
  return (
    <LegalPage title="Naudojimo sąlygos" legal={legal}>
      <H2>1. Paslaugos teikėjas</H2>
      <p>
        Paslaugą „DarboRitmas“ (toliau – Paslauga) teikia <strong>{seller}</strong>
        {legal.code ? `, įmonės kodas ${legal.code}` : ""}
        {legal.vat ? `, PVM mokėtojo kodas ${legal.vat}` : ""}
        {legal.address ? `, adresas ${legal.address}` : ""}. Kontaktai: {legal.email || "[EL. PAŠTAS]"}. Sutartį sudarote su {seller}.
      </p>

      <H2>2. Sutikimas</H2>
      <p>Pradėdami naudotis Paslauga ar registruodamiesi, patvirtinate, kad susipažinote su šiomis sąlygomis ir joms pritariate. Jei nesutinkate, Paslaugos nenaudokite.</p>

      <H2>3. Paslauga</H2>
      <p>
        DarboRitmas yra internetinė programa statybų ir kitų darbų įmonėms: darbų ir objektų planavimas, darbo laiko apskaita, medžiagų užsakymai, automobilių terminai, sąmatos ir sutartys bei pranešimai. Planų ({PLANS.map((p) => p.name).join(", ")}) turinį ir limitus rasite kainų puslapyje. Kai kurios funkcijos ir limitai priklauso nuo plano.
      </p>

      <H2>4. Paskyra ir duomenys</H2>
      <p>
        Esate atsakingi už paskyros slaptažodžio saugumą ir už tai, kad turite teisę pateikti Paslaugoje įvedamus duomenis (pvz. darbuotojų darbo laiką). Savo darbuotojų ir klientų asmens duomenų valdytojas esate jūs, o mes juos tvarkome jūsų vardu kaip duomenų tvarkytojas. Duomenų tvarkymo sutarties šabloną pateiksime paprašius. Daugiau apie duomenis: <a href="/privatumas" className="font-semibold text-accent-dark underline">privatumo politika</a>.
      </p>

      <H2>5. Leistinas naudojimas</H2>
      <p>Draudžiama naudoti Paslaugą neteisėtiems tikslams, sukčiauti ar siųsti šlamštą, pažeisti intelektinės nuosavybės teises, trikdyti ar apeiti Paslaugos saugumą (įskaitant kenkėjiškas programas, zondavimą, automatizuotą duomenų rinkimą) ir apeiti plano limitus ar vietų skaičių.</p>

      <H2>6. Intelektinė nuosavybė</H2>
      <p>Paslauga, jos kodas ir dizainas priklauso {seller}. Jūsų įvesti duomenys ir failai lieka jūsų. Suteikiame jums ribotą, neišimtinę teisę naudotis Paslauga pagal šias sąlygas.</p>

      <H2>7. Paslaugos kokybė</H2>
      <p>Siekiame, kad Paslauga veiktų patikimai, bet negarantuojame, kad ji veiks nepertraukiamai ir be klaidų. Galimi techniniai darbai ir trečiųjų šalių (pvz. debesijos, mokėjimų, Telegram) sutrikimai.</p>

      <H2>8. Kainos, mokėjimas ir prenumerata</H2>
      <p>
        Mokama už planą ir apmokamų darbuotojų (vietų) skaičių mėnesinėmis ar metinėmis prenumeratomis, kurios automatiškai pratęsiamos. Kainos nurodytos be PVM; PVM ir kitus mokesčius apskaičiuoja ir prideda Paddle pagal jūsų šalį. Bandomasis laikotarpis trunka {TRIAL_DAYS} d. be banko kortelės; jam pasibaigus prieiga sustabdoma, kol pasirenkamas planas, o duomenys išsaugomi.
      </p>
      <p>
        <strong>Atšaukimas.</strong> Prenumeratą galite atšaukti bet kada (Valdymas → Abonementas → Tvarkyti prenumeratą). Ji galioja iki apmokėto laikotarpio pabaigos ir nebus pratęsta.
        <strong> Plano keitimas.</strong> Planą ir vietų skaičių galite keisti bet kada: padidinus skaičiuojama iškart proporcingai likusiam laikotarpiui, sumažinus galioja nuo kito apmokėjimo. Grąžinimai: <a href="/grazinimai" className="font-semibold text-accent-dark underline">atšaukimas ir grąžinimai</a>.
        Mokėjimo, mokesčių ir grąžinimų sąlygos taip pat nustatytos <a href="https://www.paddle.com/legal/checkout-buyer-terms" className="font-semibold text-accent-dark underline" rel="noopener noreferrer">Paddle pirkėjo sąlygose</a>.
      </p>
      <p>
        <strong>Pardavėjas (Merchant of Record).</strong> Mūsų užsakymų procesą vykdo mūsų internetinis perpardavėjas Paddle.com. Paddle.com yra visų mūsų užsakymų pardavėjas (Merchant of Record), jis išrašo sąskaitas ir tvarko užsakymų užklausas bei grąžinimus. <em>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders.</em>
      </p>

      <H2>9. Sustabdymas ir nutraukimas</H2>
      <p>Galime apriboti ar nutraukti prieigą dėl esminio sąlygų pažeidimo, nesumokėtų mokėjimų, saugumo ar sukčiavimo rizikos arba pakartotinių ar rimtų pažeidimų. Jūs galite nustoti naudotis Paslauga bet kada ir paprašyti ištrinti savo duomenis.</p>

      <H2>10. Atsakomybė</H2>
      <p>Neribojame atsakomybės tiek, kiek tai neleidžia imperatyvios teisės normos. Kitais atvejais atsakome tik už tiesioginius nuostolius, neviršijančius sumos, kurią sumokėjote už Paslaugą per paskutinius 12 mėnesių. Neatsakome už netiesioginius nuostolius ar prarastą pelną.</p>

      <H2>11. Taikoma teisė</H2>
      <p>Šioms sąlygoms taikoma Lietuvos Respublikos teisė. Ginčus sprendžiame derybomis, o nepavykus – Lietuvos Respublikos teismuose, nebent imperatyvios teisės normos nustato kitaip.</p>

      <H2>12. Pakeitimai</H2>
      <p>Sąlygas galime keisti paskelbdami naują versiją šiame puslapyje; esminius pakeitimus pranešime iš anksto. Toliau naudodamiesi Paslauga po pakeitimų, jiems pritariate. Jei gaunate grąžinimą pagal {REFUND_DAYS} dienų taisyklę, ji taikoma ir po pakeitimų.</p>

      <H2>13. Kontaktai</H2>
      <p>Klausimai dėl Paslaugos ir sąlygų: {legal.email || "[EL. PAŠTAS]"}.</p>
    </LegalPage>
  );
}
