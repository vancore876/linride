import { CalendarClock } from "lucide-react";
import { ScheduledRide } from "@/types/linride";

type ScheduledRideFormProps = {
  ride: ScheduledRide;
};

export function ScheduledRideForm({ ride }: ScheduledRideFormProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Schedule Work Ride</p>
          <h3 className="text-xl font-black">{ride.status}</h3>
        </div>
        <CalendarClock size={23} />
      </div>
      <div className="grid gap-2 text-sm font-bold">
        <div className="rounded-2xl bg-smoke px-3 py-2">{ride.pickup.name} to {ride.destination.name}</div>
        <div className="rounded-2xl bg-smoke px-3 py-2">{ride.daysOfWeek.join(", ")} at {ride.time}</div>
        <div className="rounded-2xl bg-smoke px-3 py-2">{ride.isShared ? "Shared ride" : "Private ride"} - ${ride.offeredFareJmd.toLocaleString()} JMD</div>
      </div>
      <textarea className="mt-3 min-h-20 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" defaultValue={ride.notes} />
    </section>
  );
}
