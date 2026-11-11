export type Channel = "inapp" | "push" | "telegram" | "email" | "sms";

export const CHANNELS: { id: Channel; label: string; available: boolean }[] = [
  { id: "inapp", label: "Programa", available: true },
  { id: "telegram", label: "Telegram", available: false }, // true, kai bus adapteris (2 žingsnis)
  { id: "email", label: "El. paštas", available: false }, // 3 žingsnis
  { id: "push", label: "Telefono pranešimai", available: false },
  { id: "sms", label: "SMS", available: false },
];

export const EVENTS = {
  task_assigned: {
    label: "Nauja užduotis",
    description: "Jums priskirta ar pakeista užduotis",
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
  daily_digest: {
    label: "Rytinė apžvalga",
    description: "Šiandienos objektai ir užduotys",
    defaults: ["telegram"],
    urgent: false,
  },
  work_reminder: {
    label: "Priminimas apie darbą",
    description: "Prieš darbo pradžią",
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
  hours_missing: {
    label: "Neužregistruotos valandos",
    description: "Pamiršta baigti ar įrašyti darbo dieną",
    defaults: ["inapp"],
    urgent: false,
  },
  weekly_hours: {
    label: "Savaitės valandų suvestinė",
    description: "Praėjusios savaitės valandos",
    defaults: ["email"],
    urgent: false,
  },
  material_request: {
    label: "Medžiagų užklausa",
    description: "Nauja ar pasibaigusi medžiaga",
    defaults: ["inapp"],
    urgent: false,
  },
  hours_approved: {
    label: "Valandos patvirtintos",
    description: "Administratorius patvirtino jūsų mėnesio valandas",
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
  document_status: {
    label: "Sąmatos ir sutartys",
    description: "Išsiųsta, patvirtinta, atmesta ar atšaukta",
    defaults: ["inapp", "telegram", "email"],
    urgent: true,
  },
} as const satisfies Record<
  string,
  { label: string; description: string; defaults: readonly Channel[]; urgent: boolean }
>;

export type EventType = keyof typeof EVENTS;
