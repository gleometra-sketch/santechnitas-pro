import ContractSheet from "@/components/documents/ContractSheet";
import { KIND_LABEL, eur, lineTotal, type DocItem } from "@/lib/documents/logic";
import type { PublicDocument } from "@/lib/documents/types";

function Items({ items }: { items: DocItem[] }) {
  return (
    <div className="divide-y divide-black/10 rounded-xl border border-black/10">
      <div className="hidden grid-cols-[1fr_5rem_6rem_6rem] gap-2 bg-black/5 px-3 py-2 text-sm font-semibold sm:grid print:grid">
        <span>Aprašymas</span><span className="text-right">Kiekis</span><span className="text-right">Kaina</span><span className="text-right">Suma</span>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2 sm:grid-cols-[1fr_5rem_6rem_6rem] sm:gap-2 print:grid-cols-[1fr_5rem_6rem_6rem]">
          <span className="whitespace-pre-wrap">{it.description}</span>
          <span className="text-right font-semibold sm:order-4 print:order-4">{eur(lineTotal(it.quantity, it.unit_price))}</span>
          <span className="col-span-2 text-sm text-muted sm:order-2 sm:col-span-1 sm:text-right sm:text-base sm:text-black print:order-2 print:col-span-1 print:text-right">{it.quantity.toLocaleString("lt-LT")} {it.unit}</span>
          <span className="hidden text-right sm:order-3 sm:block print:order-3 print:block">{eur(it.unit_price)}</span>
        </div>
      ))}
    </div>
  );
}

function Totals({ net, vat, gross, rate }: { net: number; vat: number; gross: number; rate: number }) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1">
      <div className="flex justify-between"><dt>Suma be PVM</dt><dd>{eur(net)}</dd></div>
      <div className="flex justify-between"><dt>PVM {rate.toString().replace(".", ",")} %</dt><dd>{eur(vat)}</dd></div>
      <div className="flex justify-between border-t border-black/20 pt-1 text-lg font-bold"><dt>Iš viso</dt><dd>{eur(gross)}</dd></div>
    </dl>
  );
}

function Approved({ doc }: { doc: PublicDocument }) {
  if (doc.status !== "approved") return null;
  return (
    <p className="rounded-xl bg-go-soft p-3 font-medium text-go-dark">
      Patvirtino {doc.respondedName ?? doc.clientName}{doc.respondedAt ? `, ${new Date(doc.respondedAt).toLocaleString("lt-LT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vilnius" })}` : ""}.
    </p>
  );
}

export default function DocumentSheet({ doc }: { doc: PublicDocument }) {
  if (doc.kind === "contract") {
    // Sutartis rodoma kaip įprastas dokumentas (pavadinimas, antraštės, punktai, adresai ir parašai); sąmata – priedas.
    return (
      <article className="space-y-6 rounded-2xl bg-white p-5 shadow-card sm:p-8 print:rounded-none print:p-0 print:shadow-none">
        <ContractSheet doc={doc} />
        {doc.estimate && (
          <section className="space-y-3 break-before-page">
            <h2 className="text-xl font-bold">Priedas: sąmata Nr. {doc.estimate.number}</h2>
            <Items items={doc.estimate.items} />
            <Totals net={doc.estimate.totalNet} vat={doc.estimate.totalVat} gross={doc.estimate.totalGross} rate={doc.estimate.vatRate} />
          </section>
        )}
        <Approved doc={doc} />
      </article>
    );
  }
  const s = doc.seller;
  const sellerLines = [s.code && `Kodas ${s.code}`, s.vat_code && `PVM kodas ${s.vat_code}`, s.address, s.phone, s.email, s.iban && `IBAN ${s.iban}`].filter(Boolean);
  return (
    <article className="space-y-5 rounded-2xl bg-white p-5 shadow-card print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <p className="text-xl font-extrabold">{s.legal_name ?? ""}</p>
          {sellerLines.length > 0 && <p className="text-sm text-muted">{sellerLines.join(" · ")}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{KIND_LABEL[doc.kind]} Nr. {doc.number}</p>
          {doc.sentAt && <p className="text-sm text-muted">{doc.sentAt.slice(0, 10)}</p>}
          {doc.validUntil && <p className="text-sm text-muted">Galioja iki {doc.validUntil}</p>}
        </div>
      </header>

      <section className="grid gap-1 text-sm sm:grid-cols-2">
        <p><span className="text-muted">Klientas: </span><span className="font-semibold">{doc.clientName}</span>{doc.clientAddress ? `, ${doc.clientAddress}` : ""}</p>
        {doc.workAddress && <p><span className="text-muted">Darbų adresas: </span>{doc.workAddress}</p>}
      </section>

      <h1 className="text-2xl font-extrabold">{doc.title}</h1>

      {doc.kind === "estimate" ? (
        <>
          <Items items={doc.items} />
          <Totals net={doc.totalNet} vat={doc.totalVat} gross={doc.totalGross} rate={doc.vatRate} />
          {doc.notes && <p className="whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm">{doc.notes}</p>}
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap leading-relaxed">{doc.body}</p>
          <Totals net={doc.totalNet} vat={doc.totalVat} gross={doc.totalGross} rate={doc.vatRate} />
          {doc.estimate && (
            <section className="space-y-3 break-before-page">
              <h2 className="text-xl font-bold">Priedas: sąmata Nr. {doc.estimate.number}</h2>
              <Items items={doc.estimate.items} />
              <Totals net={doc.estimate.totalNet} vat={doc.estimate.totalVat} gross={doc.estimate.totalGross} rate={doc.estimate.vatRate} />
            </section>
          )}
        </>
      )}

      {doc.status === "approved" && (
        <p className="rounded-xl bg-go-soft p-3 font-medium text-go-dark">
          Patvirtino {doc.respondedName ?? doc.clientName}{doc.respondedAt ? `, ${new Date(doc.respondedAt).toLocaleString("lt-LT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vilnius" })}` : ""}.
        </p>
      )}
    </article>
  );
}
