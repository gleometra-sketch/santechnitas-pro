export type ProjectRow = { id: string; name: string; address: string | null; orderNo: string | null; notes: string | null; archived: boolean };

export type MemberRow = {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "worker";
  status: "invited" | "active" | "removed";
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

export type TimeRow = { id: string; startedAt: string; endedAt: string | null; minutes: number };

export const ROLE_LABEL: Record<MemberRow["role"], string> = { owner: "Savininkas", admin: "Administratorius", worker: "Darbuotojas" };
