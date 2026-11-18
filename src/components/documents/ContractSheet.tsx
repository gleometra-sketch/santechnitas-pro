import { cityFromAddress, nextRoman, parseContractBody } from "@/lib/documents/layout";
import type { PublicDocument } from "@/lib/documents/types";

const clauseCls = "indent-10 text-justify";

/** Sutartis kaip įprastas dokumentas: centruota pavadinimas, romėniškos antraštės, punktai ir adresų bei parašų blokas. */
export default function ContractSheet({ doc }: { doc: PublicDocument }) {
  const { date, blocks } = parseContractBody(doc.body ?? "");
  const s = doc.seller;
  const city = cityFromAddress(s.address);
  const signRoman = nextRoman(blocks);
  const sellerLines: string[] = [
    s.address ? `Adresas ${s.address}` : "Adresas",
    s.code ? `Kodas ${s.code}` : "",
    s.vat_code ? `PVM mokėtojo kodas ${s.vat_code}` : "",
    s.phone ? `Tel. ${s.phone}` : "",
    s.email ? `El. paštas ${s.email}` : "",
    s.iban ? `A. s. ${s.iban}` : "",
  ].filter(Boolean);
  const clientLines: string[] = [doc.clientAddress ? `Adresas ${doc.clientAddress}` : "Adresas"];

  return (
    <div className="font-serif text-[15px] leading-relaxed text-black print:text-[12pt]">
      <h1 className="text-center text-lg font-bold uppercase print:text-[14pt]">Darbų atlikimo sutartis</h1>
      <p className="mt-3 text-center">{date ?? (doc.sentAt ? doc.sentAt.slice(0, 10) : "")} Nr. {doc.number}</p>
      {city && <p className="text-center">{city}</p>}

      <div className="mt-5 space-y-2">
        {blocks.map((b, i) =>
          b.type === "heading" ? (
            <h2 key={i} className="pt-3 text-center font-bold uppercase">{b.roman}. {b.text}</h2>
          ) : (
            <p key={i} className={`${clauseCls} break-words`}>{b.text}</p>
          ),
        )}
      </div>

      <section className="mt-6 break-inside-avoid">
        <h2 className="pb-3 text-center font-bold uppercase">{signRoman}. Šalių adresai ir parašai</h2>
        <div className="grid grid-cols-2 gap-x-10 gap-y-6">
          <div>
            <p className="font-bold">Užsakovas</p>
            <p className="mt-3 font-bold">{doc.clientName}</p>
            {clientLines.map((l) => <p key={l}>{l}</p>)}
          </div>
          <div>
            <p className="font-bold">Rangovas</p>
            <p className="mt-3 font-bold">{s.legal_name ?? ""}</p>
            {sellerLines.map((l) => <p key={l} className="break-words">{l}</p>)}
          </div>
          <div className="pt-10">
            <div className="border-t border-black" />
            <p>(parašas)</p>
            <p>{doc.clientName}</p>
          </div>
          <div className="pt-10">
            <div className="border-t border-black" />
            <p>(parašas)</p>
            <p>{s.legal_name ?? ""}</p>
            <p className="pl-10">A. V.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
