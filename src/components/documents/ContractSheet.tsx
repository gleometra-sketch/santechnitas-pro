import { cityFromAddress, nextRoman, parseContractBody } from "@/lib/documents/layout";
import type { PublicDocument } from "@/lib/documents/types";

const clauseCls = "indent-10 text-justify";

function Signatures({ doc, roman }: { doc: PublicDocument; roman: string | null }) {
  const s = doc.seller;
  const sellerLines: string[] = [
    s.address ? `Adresas ${s.address}` : "Adresas",
    s.code ? `Kodas ${s.code}` : "",
    s.vat_code ? `PVM mokėtojo kodas ${s.vat_code}` : "",
    s.phone ? `Tel. ${s.phone}` : "",
    s.email ? `El. paštas ${s.email}` : "",
    s.iban ? `A. s. ${s.iban}` : "",
  ].filter(Boolean);
  const clientLines: string[] = [doc.clientAddress ? `Adresas ${doc.clientAddress}` : "Adresas"];
  const role = s.director_title?.trim() || "Direktorius";
  return (
    <section className="mt-6 break-inside-avoid">
      {roman && <h2 className="pb-3 text-center font-bold uppercase">{roman}. Šalių adresai ir parašai</h2>}
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
          <p>{s.director?.trim() || s.legal_name || ""}</p>
          {s.director?.trim() && <p>{role}</p>}
          <p className="pl-10">A. V.</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Sutartis kaip įprastas dokumentas: centruotas pavadinimas, romėniškos antraštės, punktai ir adresų bei parašų blokas.
 * Veikia su standartiniu šablonu ir su įmonės pačios šablonu (jos pavadinimu, antraštėmis ir {{parasu_blokas}} vieta).
 */
export default function ContractSheet({ doc }: { doc: PublicDocument }) {
  const { date, title, blocks, hasSignatures } = parseContractBody(doc.body ?? "", doc.number);
  const city = cityFromAddress(doc.seller.address);
  const signRoman = nextRoman(blocks);
  return (
    <div className="font-serif text-[15px] leading-relaxed text-black print:text-[12pt]">
      <h1 className="text-center text-lg font-bold uppercase print:text-[14pt]">{title ?? "Darbų atlikimo sutartis"}</h1>
      {date !== null && (
        <>
          <p className="mt-3 text-center">{date} Nr. {doc.number}</p>
          {city && <p className="text-center">{city}</p>}
        </>
      )}

      <div className="mt-5 space-y-2">
        {blocks.map((b, i) =>
          b.type === "heading" ? (
            <h2 key={i} className="pt-3 text-center font-bold uppercase">{b.roman}. {b.text}</h2>
          ) : b.type === "signatures" ? (
            <Signatures key={i} doc={doc} roman={null} />
          ) : (
            <p key={i} className={`${b.text.length > 45 ? clauseCls : ""} break-words`}>{b.text}</p>
          ),
        )}
      </div>

      {!hasSignatures && <Signatures doc={doc} roman={signRoman} />}
    </div>
  );
}
