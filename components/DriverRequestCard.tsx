import { useState } from "react";
import Image from "next/image";
import { Banknote, MapPinned, ShieldAlert } from "lucide-react";
import { RideRequest } from "@/types/linride";

type DriverRequestCardProps = {
  request: RideRequest;
  canRespond: boolean;
  onAccept?: (request: RideRequest) => void;
  onCounter?: (request: RideRequest, fareJmd: number) => void;
  onIgnore?: (request: RideRequest) => void;
};

export function DriverRequestCard({ request, canRespond, onAccept, onCounter, onIgnore }: DriverRequestCardProps) {
  const [counterFare, setCounterFare] = useState(request.offeredFareJmd + 300);

  return (
    <article className="linride-list-item">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {request.riderAvatarUrl ? (
            <Image unoptimized width={44} height={44} src={request.riderAvatarUrl} alt={`${request.riderName} profile`} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-black text-white">{request.riderName.slice(0, 1)}</span>
          )}
          <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">{request.serviceType}</p>
          <h3 className="text-lg font-black">{request.riderName}</h3>
          </div>
        </div>
        <span className="linride-status-badge linride-status-pending">
          {request.distanceKm > 0 ? `${request.distanceKm} km / ${(request.distanceKm * 0.621371).toFixed(1)} mi` : "Calculating"}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p className="flex gap-2 font-bold">
          <MapPinned size={17} className="shrink-0 text-linred" />
          {request.pickup.name} to {request.destination.name}
        </p>
        <p className="flex gap-2 font-bold">
          <Banknote size={17} className="shrink-0 text-linred" />
          ${request.offeredFareJmd.toLocaleString()} JMD - {request.paymentMethod} - {request.vehicleType}
        </p>
        {request.scheduledTime && <p className="font-bold text-charcoal/65">Scheduled: {new Date(request.scheduledTime).toLocaleString()}</p>}
        {(request.pickupLandmark || request.destinationLandmark || request.riderLocationNote) && (
          <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-charcoal/65">
            {request.pickupLandmark && <p>Pickup landmark: {request.pickupLandmark}</p>}
            {request.destinationLandmark && <p>Destination landmark: {request.destinationLandmark}</p>}
            {request.riderLocationNote && <p>Passenger note: {request.riderLocationNote}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {[
            request.callWhenNearby && "Call when nearby",
            request.badRoadNote && "Rough road",
            request.heavyItem && "Heavy item",
            request.fragileItem && "Fragile item",
            request.extraStop && "Extra stop",
            request.returnTrip && "Return trip"
          ].filter(Boolean).map((label) => <span key={String(label)} className="linride-status-badge linride-status-pending">{label}</span>)}
        </div>
      </div>
      <p className="mt-3 flex gap-2 rounded-2xl bg-smoke px-3 py-2 text-xs font-bold text-charcoal/62">
        <ShieldAlert size={16} className="shrink-0 text-linred" />
        Only accept rides you can complete safely.
      </p>
      <div className="mt-4 rounded-2xl border border-black/10 bg-smoke p-3">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-charcoal/50">Counter offer</label>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-black">$</span>
          <input
            type="number"
            min={0}
            step={50}
            value={counterFare}
            onChange={(event) => setCounterFare(Number(event.target.value))}
            className="linride-input py-2"
          />
          <span className="text-xs font-black text-charcoal/50">JMD</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!canRespond}
          onClick={() => onAccept?.(request)}
          className="rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink disabled:opacity-40"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={!canRespond}
          onClick={() => onCounter?.(request, counterFare)}
          className="rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white disabled:opacity-40"
        >
          Counter
        </button>
        <button type="button" onClick={() => onIgnore?.(request)} className="rounded-2xl bg-smoke px-3 py-3 text-xs font-black">
          Ignore
        </button>
      </div>
    </article>
  );
}
