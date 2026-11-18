import type { LineKind } from "@/lib/estimates/calc";
import type { DocKind } from "./logic";

// Redaktoriaus juodraščio formos (visos reikšmės tekstai, nes taip jas laiko laukeliai).
// Laikoma ATSKIRAME faile, o ne "use client" komponente: serverio puslapis negali naudoti reikšmių, eksportuotų iš kliento modulio
// (serveryje jos virsta tuščia nuoroda, ir {...EMPTY_ITEM} tampa {}).
/** `kind` (medžiaga / darbas / kita) naudojamas tik katalogui: dokumento eilutėje jis nesaugomas. */
export type DraftItem = { kind: LineKind; description: string; quantity: string; unit: string; unit_price: string };
export type Draft = {
  id?: string; kind: DocKind; title: string; projectId: string; estimateId: string; clientName: string; clientEmail: string; clientPhone: string;
  clientAddress: string; workAddress: string; vatRate: string; validUntil: string; notes: string; body: string; totalGross: string; items: DraftItem[];
};
export const EMPTY_ITEM: DraftItem = { kind: "material", description: "", quantity: "1", unit: "vnt.", unit_price: "" };
