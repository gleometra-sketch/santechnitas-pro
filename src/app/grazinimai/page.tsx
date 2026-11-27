import LegalPage, { H2 } from "@/components/legal/LegalPage";
import { REFUND_DAYS, getLegal } from "@/lib/legal";

export const metadata = { title: "Atšaukimas ir grąžinimai · DarboRitmas" };
export const dynamic = "force-dynamic";

export default function RefundPage() {
  const legal = getLegal();
  return (
    <LegalPage title="Prenumeratos atšaukimas ir grąžinimai" legal={legal}>
      <H2>Atšaukimas</H2>
      <p>
        Prenumeratą galite atšaukti bet kada: Valdymas → Abonementas → <strong>Tvarkyti prenumeratą</strong> (Paddle portalas). Atšaukus, prieiga lieka iki jau apmokėto laikotarpio pabaigos, prenumerata nebus pratęsta ir nauji mokėjimai nebus imami. Duomenys išsaugomi, todėl vėliau galėsite pasirinkti planą iš naujo.
      </p>

      <H2>Plano ar vietų skaičiaus keitimas</H2>
      <p>
        Planą ir darbuotojų (vietų) skaičių galite keisti bet kada. <strong>Padidinus</strong> planą ar vietas, skirtumas už likusį laikotarpį apskaičiuojamas proporcingai ir imamas iškart. <strong>Sumažinus</strong>, naujas planas ar vietų skaičius galioja nuo kito apmokėjimo. Laikotarpio (mėnesinis ar metinis) toje pačioje prenumeratoje keisti negalima; jei norite pakeisti, atšaukite prenumeratą ir užsisakykite naują.
      </p>

      <H2>Grąžinimai ({REFUND_DAYS} dienų)</H2>
      <p>
        Jei persigalvojote, grąžinimo prašymą pateikite <strong>per {REFUND_DAYS} dienų nuo mokėjimo dienos</strong>: tokius prašymus tenkiname. Praėjus šiam laikotarpiui prašymus nagrinėjame tik išskirtiniais atvejais, pavyzdžiui, jei per daug nuskaityta, mokėjimas pasikartojo ar paslauga neveikė dėl mūsų kaltės. Prenumeratą visada galite atšaukti, kad ji nebūtų pratęsta.
      </p>
      <p>
        <strong>Kaip prašyti:</strong> grąžinimo prašymą pateikite per Paddle: <a href="https://paddle.net" className="font-semibold text-accent-dark underline" rel="noopener noreferrer">paddle.net</a> (reikės el. pašto, kuriuo atlikote mokėjimą, ar užsakymo numerio iš sąskaitos). Galite rašyti ir mums: {legal.email || "[EL. PAŠTAS]"}. Grąžinimus įvykdo Paddle, nes jis yra pardavėjas (Merchant of Record). Taikoma ir{" "}
        <a href="https://www.paddle.com/legal/refund-policy" className="font-semibold text-accent-dark underline" rel="noopener noreferrer">Paddle grąžinimo politika</a>.
      </p>

      <H2>Nepavykęs mokėjimas</H2>
      <p>Jei kortelė atmesta ar mokėjimas nepavyksta, Paddle praneša ir bando dar kartą. Kortelę galite atnaujinti Paddle portale (Tvarkyti prenumeratą).</p>

      <H2>Summary (English)</H2>
      <p>
        You can cancel your subscription at any time from Management → Subscription → Manage subscription. Access continues until the end of the paid period and the subscription is not renewed. Plan or seat increases are charged pro rata immediately; decreases apply from the next billing date. You can request a refund within {REFUND_DAYS} days of payment at <a href="https://paddle.net" className="font-semibold text-accent-dark underline" rel="noopener noreferrer">paddle.net</a>. Paddle.com is the Merchant of Record and processes refunds.
      </p>
    </LegalPage>
  );
}
