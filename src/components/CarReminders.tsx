import CarKmForm from "@/components/CarKmForm";
import { carAlerts, type CarRow, type Level } from "@/lib/cars/logic";

const STYLE: Record<Level, string> = {
  expired: "bg-red-50 text-danger",
  warn: "bg-amber-50 text-amber-800",
  ok: "bg-go-soft text-go-dark",
};

/** Rodo vairuotojo automobilį (visada) ir kitus įmonės automobilius tik kai yra įspėjimų (administratoriui). */
export default function CarReminders({ cars, today, userId }: { cars: CarRow[]; today: string; userId: string }) {
  const items = cars
    .map((car) => ({ car, alerts: carAlerts(car, today), mine: car.driver_id === userId }))
    .filter((x) => x.mine || x.alerts.length > 0);
  if (items.length === 0) return null;

  return (
    <section aria-label="Automobiliai" className="mb-5 space-y-3">
      {items.map(({ car, alerts, mine }) => (
        <div key={car.id} className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-lg font-bold">
            {car.name} <span className="font-normal text-muted">{car.plate}</span>
            {!car.active && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-sm font-medium text-muted">neaktyvus</span>}
          </p>
          {alerts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {alerts.map((a) => <li key={a.kind} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${STYLE[a.level]}`}>{a.text}</li>)}
            </ul>
          )}
          {mine && car.active && <CarKmForm carId={car.id} km={car.km} reminderDays={car.reminder_days} />}
          {mine && !car.active && <p className="mt-2 text-sm text-muted">Automobilis laikinai neaktyvus: kilometražo priminimai sustabdyti.</p>}
        </div>
      ))}
    </section>
  );
}
