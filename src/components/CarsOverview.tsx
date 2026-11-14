import Link from "next/link";
import CarKmForm from "@/components/CarKmForm";
import CarStatusTiles from "@/components/CarStatusTiles";
import type { CarRow } from "@/lib/cars/logic";

/**
 * Automobilių skiltis visiems: vairuotojas mato savo automobilį ir įveda kilometražą,
 * administratorius mato visus įmonės automobilius ir nuorodą į tvarkymą.
 */
export default function CarsOverview({ cars, today, userId, admin }: { cars: CarRow[]; today: string; userId: string; admin: boolean }) {
  return (
    <div className="space-y-4">
      {admin && (
        <Link href="/valdymas/automobiliai" className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-white">
          Tvarkyti automobilius (pridėti, redaguoti, priskirti)
        </Link>
      )}
      {cars.length === 0 && (
        <p className="rounded-2xl bg-white p-4 text-muted shadow-card">
          {admin ? "Automobilių dar nėra. Pridėkite pirmąjį per „Tvarkyti automobilius“." : "Jums automobilis nepriskirtas."}
        </p>
      )}
      {cars.map((car) => {
        const mine = car.driver_id === userId;
        return (
          <article key={car.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold">
                  {car.name} <span className="font-bold text-muted">{car.plate}</span>
                </h2>
                <p className="text-sm font-medium text-muted">{mine ? "Jūsų automobilis" : "Kitas įmonės automobilis"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${car.active ? "bg-go-soft text-go-dark" : "bg-surface text-muted"}`}>
                {car.active ? "Aktyvus" : "Neaktyvus"}
              </span>
            </div>

            <CarStatusTiles car={car} today={today} />

            {mine && car.active && <CarKmForm carId={car.id} km={car.km} reminderDays={car.reminder_days} />}
            {mine && !car.active && <p className="mt-3 text-sm text-muted">Automobilis laikinai neaktyvus: kilometražo priminimai sustabdyti.</p>}
          </article>
        );
      })}
    </div>
  );
}
