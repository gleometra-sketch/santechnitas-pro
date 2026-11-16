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
    <div className="space-y-3">
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
          <article key={car.id} className="rounded-2xl bg-white p-3 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-base font-extrabold">
                {car.name} <span className="font-bold text-muted">{car.plate}</span>
                {mine && <span className="ml-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-dark">Mano</span>}
              </h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${car.active ? "bg-go-soft text-go-dark" : "bg-surface text-muted"}`}>
                {car.active ? "Aktyvus" : "Neaktyvus"}
              </span>
            </div>

            <CarStatusTiles car={car} today={today} />

            {mine && car.active && <CarKmForm carId={car.id} km={car.km} reminderDays={car.reminder_days} />}
            {mine && !car.active && <p className="mt-2 text-sm text-muted">Automobilis laikinai neaktyvus: kilometražo priminimai sustabdyti.</p>}
          </article>
        );
      })}
    </div>
  );
}
