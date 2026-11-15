import type { DocItem, DocKind, DocStatus, Seller } from "./logic";

export type DocumentSummary = {
  id: string; kind: DocKind; number: string; title: string; status: DocStatus; clientName: string;
  projectId: string | null; totalGross: number; createdAt: string; sentAt: string | null; respondedAt: string | null;
};

export type DocumentEvent = { event: string; actor: string | null; detail: string | null; createdAt: string };

export type DocumentDetail = DocumentSummary & {
  estimateId: string | null; clientEmail: string | null; clientPhone: string | null; clientAddress: string | null;
  workAddress: string | null; vatRate: number; validUntil: string | null; notes: string | null; body: string | null;
  totalNet: number; totalVat: number; publicToken: string | null; respondedName: string | null; responseNote: string | null;
  items: DocItem[]; events: DocumentEvent[];
};

export type PublicDocument = {
  kind: DocKind; number: string; title: string; status: DocStatus; seller: Seller; clientName: string; clientAddress: string | null;
  workAddress: string | null; vatRate: number; validUntil: string | null; notes: string | null; body: string | null;
  totalNet: number; totalVat: number; totalGross: number; items: DocItem[];
  estimate: { number: string; vatRate: number; totalNet: number; totalVat: number; totalGross: number; items: DocItem[] } | null;
  sentAt: string | null; respondedAt: string | null; respondedName: string | null; expired: boolean;
};
