import type { Category } from "@/lib/telegram/core";

export type Channel = "inapp" | "push" | "telegram" | "email" | "sms";

/**
 * Telegram skirtas TIK įmonės administratoriams (prijungiama Valdymas → Telegram, lentelė telegram_links).
 * `adminOnly` kanalas nerodomas darbuotojams.
 */
export const CHANNELS: { id: Channel; label: string; available: boolean; adminOnly?: boolean }[] = [
  { id: "inapp", label: "Programa", available: true },
  { id: "telegram", label: "Telegram", available: true, adminOnly: true },
  { id: "email", label: "El. paštas", available: false },
  { id: "push", label: "Telefono pranešimai", available: false },
  { id: "sms", label: "SMS", available: false },
];

export type EventDef = {
  label: string;
  description: string;
  /** Kanalai, kuriais siunčiama, kol naudotojas nepasirinko kitaip. */
  defaults: readonly Channel[];
  /** Skubus: siunčiamas ir tylos valandomis. */
  urgent: boolean;
  /** Įvykis aktualus tik administratoriams (darbuotojams nerodomas nustatymuose). */
  adminOnly?: boolean;
  /** Telegram kategorija, kurią administratorius gali išjungti botui parašęs /isjungti. */
  telegramCategory?: Category;
};

export const EVENTS = {
  task_assigned: {
    label: "Nauja užduotis",
    description: "Jums priskirta ar pakeista užduotis",
    defaults: ["inapp"],
    urgent: false,
  },
  daily_digest: {
    label: "Rytinė apžvalga",
    description: "Šiandienos objektai ir užduotys",
    defaults: ["inapp"],
    urgent: false,
  },
  work_reminder: {
    label: "Priminimas apie darbą",
    description: "Prieš darbo pradžią",
    defaults: ["inapp"],
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
    defaults: ["inapp"],
    urgent: false,
  },
  // Medžiagų poreikio Telegram žinutę administratoriams siunčia src/lib/telegram/notify.ts tiesiogiai (su sąrašu),
  // todėl čia tik programos varpelis: kitaip administratorius gautų dvi žinutes.
  material_request: {
    label: "Medžiagų prašymas",
    description: "Darbuotojas pateikė naują medžiagų prašymą",
    defaults: ["inapp"],
    urgent: false,
    adminOnly: true,
  },
  hours_approved: {
    label: "Valandos patvirtintos",
    description: "Administratorius patvirtino jūsų mėnesio valandas",
    defaults: ["inapp"],
    urgent: false,
  },
  document_status: {
    label: "Sąmatos ir sutartys",
    description: "Išsiųsta, patvirtinta, atmesta ar atšaukta",
    defaults: ["inapp", "telegram"],
    urgent: true,
    adminOnly: true,
  },
  car_deadline: {
    label: "Automobilio terminai",
    description: "Techninė apžiūra, kelių mokestis ar draudimas baigiasi",
    defaults: ["inapp", "telegram"],
    urgent: true,
    telegramCategory: "automobiliai",
  },
  car_km: {
    label: "Kilometražo priminimas",
    description: "Laikas įvesti automobilio kilometražą",
    defaults: ["inapp"],
    urgent: false,
  },
  car_oil: {
    label: "Tepalų keitimas",
    description: "Artėja arba pavėluotas automobilio tepalų keitimas",
    defaults: ["inapp", "telegram"],
    urgent: false,
    telegramCategory: "automobiliai",
  },
} as const satisfies Record<string, EventDef>;

export type EventType = keyof typeof EVENTS;

export const eventDef = (e: EventType): EventDef => EVENTS[e];
