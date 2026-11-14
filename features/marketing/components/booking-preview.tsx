import { CircleCheck, Scissors, Star } from "lucide-react";

const SLOTS = [
  { time: "9:00", state: "open" },
  { time: "9:30", state: "taken" },
  { time: "10:00", state: "open" },
  { time: "10:30", state: "picked" },
  { time: "11:00", state: "open" },
  { time: "11:30", state: "taken" },
] as const;

/** A drawing of the customer booking screen for the hero. Decorative. */
export function BookingPreview() {
  return (
    <div aria-hidden className="relative mx-auto mb-7 w-full max-w-[17rem] select-none">
      <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-navy-900 bg-white shadow-2xl">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent">
              <Scissors className="size-5 text-green-700" />
            </span>
            <div>
              <p className="text-sm font-semibold">Kuya Jun&apos;s Barbershop</p>
              <p className="flex items-center gap-1 text-xs text-slate-600">
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                4.8 · Concepcion Uno
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-green-600 bg-accent/60 p-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Haircut</span>
              <span>₱150</span>
            </div>
            <p className="text-xs text-slate-600">30 min</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Wed, Mar 10</p>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((slot) => (
                <span
                  key={slot.time}
                  className={
                    slot.state === "picked"
                      ? "rounded-md bg-navy-900 py-1.5 text-center text-xs font-semibold text-white"
                      : slot.state === "taken"
                        ? "rounded-md border border-dashed py-1.5 text-center text-xs text-slate-600 line-through"
                        : "rounded-md border py-1.5 text-center text-xs font-medium"
                  }
                >
                  {slot.time}
                </span>
              ))}
            </div>
          </div>

          <span className="rounded-md bg-primary py-2.5 text-center text-sm font-semibold text-white">
            Book na
          </span>
        </div>
      </div>

      <div className="absolute -bottom-7 left-1/2 flex w-max -translate-x-1/2 items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg lg:-left-14 lg:translate-x-0">
        <CircleCheck className="size-5 text-green-700" />
        <div>
          <p className="text-xs font-semibold">Booking confirmed</p>
          <p className="text-xs text-slate-600">SMS sent to customer</p>
        </div>
      </div>
    </div>
  );
}
