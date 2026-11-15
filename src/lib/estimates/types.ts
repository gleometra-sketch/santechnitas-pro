import type { LineKind } from "./calc";

export type EstimateStatus = "draft" | "sent" | "accepted" | "rejected";
export const STATUSES: EstimateStatus[] = ["draft", "sent", "accepted", "rejected"];
export const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: "Juodraštis",
  sent: "Išsiųsta",
  accepted: "Patvirtinta",
  rejected: "Atmesta",
};
export const isStatus = (v: string): v is EstimateStatus => (STATUSES as string[]).includes(v);

export type EstimateLineRow = { id: string; kind: LineKind; name: string; unit: string; qtyMilli: number; priceCents: number };

export type EstimateFull = {
  id: string;
  number: string;
  title: string;
  projectId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  status: EstimateStatus;
  /** Šimtosiomis: 21 % = 2100. */
  vatHundredths: number;
  discountHundredths: number;
  validUntil: string;
  notes: string;
  lines: EstimateLineRow[];
};

export type EstimateListRow = {
  id: string;
  number: string;
  title: string;
  clientName: string | null;
  status: EstimateStatus;
  createdAt: string;
  totalCents: number;
};

export type ProjectOption = {
  id: string;
  name: string;
  address: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
};

export type CatalogRow = { id: string; kind: LineKind; name: string; unit: string; priceCents: number; lastUsedAt: string };
