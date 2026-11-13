export type Channel = "inapp" | "push" | "telegram" | "email" | "sms";

export const CHANNELS: { id: Channel; label: string; available: boolean }[] = [
  { id: "inapp", label: "Programa", available: true },
  { id: "telegram", label: "Telegram", available: true },
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
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
  weekly_hours: {
    label: "Savaitės valandų suvestinė",
    description: "Praėjusios savaitės valandos",
    defaults: ["email", "telegram"],
    urgent: false,
  },
  material_request: {
    label: "Medžiagų užklausa",
    description: "Nauja ar pasibaigusi medžiaga",
    defaults: ["inapp", "telegram"],
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
  car_deadline: {
    label: "Automobilio terminai",
    description: "Techninė apžiūra, kelių mokestis ar draudimas baigiasi",
    defaults: ["inapp", "telegram"],
    urgent: true,
  },
  car_km: {
    label: "Kilometražo priminimas",
    description: "Laikas įvesti automobilio kilometražą",
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
  car_oil: {
    label: "Tepalų keitimas",
    description: "Artėja arba pavėluotas automobilio tepalų keitimas",
    defaults: ["inapp", "telegram"],
    urgent: false,
  },
} as const satisfies Record<
  string,
  { label: string; description: string; defaults: readonly Channel[]; urgent: boolean }
>;

export type EventType = keyof typeof EVENTS;
