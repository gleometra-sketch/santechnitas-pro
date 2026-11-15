import CarKmForm from "@/components/CarKmForm";
import { calendarCarItems, type CarRow, type Level } from "@/lib/cars/logic";

const STYLE: Record<Level, string> = {
  expired: "border-danger bg-red-50 text-danger",
  warn: "border-amber-500 bg-amber-50 text-amber-800",
  ok: "border-go-dark bg-go-soft text-go-dark",
};

/**
 * Kalendoriaus priminimai: automobilis rodomas tik kai yra ką priminti. Kilometražo langelis atsiranda tik
 * vairuotojui, kai atėjo laikas įvesti rodmenį; įvedus – dingsta iki kito priminimo.
 */
export default function CarReminders({ cars, today, userId }: { cars: CarRow[]; today: string; userId: string }) {
  const items = calendarCarItems(cars, today, userId);
  if (items.length === 0) return null;

  return (
    <section aria-label="Automobiliai" className="mb-5 space-y-3">
      {items.map(({ car, alerts, showKmForm }) => (
        <div key={car.id} className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-lg font-bold">
            {car.name} <span className="font-normal text-muted">{car.plate}</span>
            {!car.active && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-sm font-medium text-muted">neaktyvus</span>}
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.map((a) => <li key={a.kind} className={`rounded-lg border-l-8 px-3 py-2 text-base font-bold ${STYLE[a.level]}`}>{a.text}</li>)}
          </ul>
          {showKmForm && <CarKmForm carId={car.id} km={car.km} reminderDays={car.reminder_days} />}
        </div>
      ))}
    </section>
  );
}
