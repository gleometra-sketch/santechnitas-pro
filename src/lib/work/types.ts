export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type ChecklistItem = { id: string; title: string; isDone: boolean };

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  status: "planned" | "in_progress" | "done";
  projectId: string | null;
  projectName: string | null;
  address: string | null;
  orderNo: string | null;
  items: ChecklistItem[];
};

export type NoteView = { id: string; body: string; isDone: boolean };

export type MaterialRequestView = {
  id: string;
  createdAt: string;
  comment: string | null;
  projectName: string | null;
  items: { id: string; name: string; quantity: number; unit: string; purchased: boolean }[];
};

export type WorkStatus = "idle" | "working" | "break" | "done" | "off";

export type TimeMode = "hours" | "project";
export const TIME_MODE_LABEL: Record<TimeMode, string> = { hours: "Tik valandos", project: "Valandos pagal objektą" };

export type TimeProject = { id: string; name: string; address: string | null };

export type WorkState = {
  status: WorkStatus;
  /** Galiojantis režimas: ar prieš darbą reikia pasirinkti objektą. */
  mode: TimeMode;
  /** Objektai, iš kurių galima rinktis (tik „pagal objektą“ režime). */
  projects: TimeProject[];
  /** Objektas, kuriame dabar dirbama (neužbaigtas įrašas). */
  projectId: string | null;
  /** Paskutinis naudotas objektas – siūlomas pradedant. */
  defaultProjectId: string | null;
  /** Dirbta (be pertraukų) einamajame neužbaigtame įraše, ms, serverio skaičiavimu. */
  workedMsAtRender: number;
  todayMinutes: number;
  weekMinutes: number;
};

export const UNITS = ["vnt.", "m", "kg", "l", "rul.", "kompl.", "pak.", "dėž.", "m²", "m³", "por.", "ryš."] as const;

/* ----------------------------------------------------- administratoriaus medžiagos */
export type MaterialStatusFilter = "needed" | "purchased" | "all";

export type MaterialFilters = {
  status: MaterialStatusFilter;
  employeeId: string | null;
  projectId: string | null;
  material: string;
  /** YYYY-MM-DD (Europe/Vilnius), įskaitytinai. */
  from: string | null;
  to: string | null;
};

export type AdminMaterialItem = {
  id: string;
  requestId: string;
  name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  purchasedAt: string | null;
  purchasedByName: string | null;
  requestedAt: string;
  employeeName: string;
  projectName: string | null;
  projectAddress: string | null;
  comment: string | null;
};

export type MaterialSummary = {
  missingItems: number;
  openRequests: number;
  requestsToday: number;
  purchasedItems: number;
};

export type MaterialOptions = {
  employees: { id: string; name: string }[];
  projects: { id: string; name: string; address: string | null }[];
};
