export type ProjectRow = {
  id: string;
  name: string;
  address: string | null;
  orderNo: string | null;
  notes: string | null;
  archived: boolean;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
};

export type ProjectFile = { id: string; name: string; mime: string; size: number; createdAt: string; url: string | null; uploaderName: string };
export type ProjectMaterial = { id: string; name: string; quantity: number; unit: string; purchased: boolean };
export type ProjectHours = { totalMinutes: number; monthMinutes: number; byEmployee: { userId: string; name: string; minutes: number }[] };

export type MemberRow = {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "worker";
  status: "invited" | "active" | "removed";
  /** Asmeninis laiko režimas; null – pagal įmonės nustatymą. */
  timeMode: "hours" | "project" | null;
  /** Šiandien galiojantis valandinis įkainis (centais) ir nuo kada – mato tik administratorius. */
  rateCents: number | null;
  rateFrom: string | null;
};

export type AdminTask = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  status: "planned" | "in_progress" | "done";
  projectId: string | null;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  items: { id: string; title: string; isDone: boolean }[];
};

export type TimeRow = { id: string; startedAt: string; endedAt: string | null; minutes: number; projectId: string | null; stale: boolean };

export type StaleEntry = { id: string; userId: string; name: string; startedAt: string };

export const ROLE_LABEL: Record<MemberRow["role"], string> = { owner: "Savininkas", admin: "Administratorius", worker: "Darbuotojas" };

export type ReportProjectLine = { projectId: string | null; name: string; minutes: number; amountCents: number };

export type ReportRow = {
  userId: string;
  name: string;
  minutes: number;
  amountCents: number;
  /** Minutės, kurioms įkainis nenustatytas (į sumą neįtrauktos). */
  missingRateMinutes: number;
  /** Įkainis mėnesio pabaigoje (centais) arba null. */
  rateCents: number | null;
  openCount: number;
  byProject: ReportProjectLine[];
  /** Kada patvirtinta (tada rodomi užšaldyti duomenys); null – dar nepatvirtinta. */
  approvedAt: string | null;
};

export type MonthReport = {
  ym: string;
  rows: ReportRow[];
  byProject: ReportProjectLine[];
  totalMinutes: number;
  totalAmountCents: number;
  missingRateMinutes: number;
  openCount: number;
  approvedCount: number;
};
