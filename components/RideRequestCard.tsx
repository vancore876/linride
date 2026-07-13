import { Clock3, CreditCard, Route } from "lucide-react";
import { RideRequestDraft, RideStatus } from "@/types/linride";

type LocationPermissionState = "unknown" | "requesting" | "granted" | "denied";

type RideRequestCardProps = {
  draft: RideRequestDraft;
  status: RideStatus;
  counterOfferJmd?: number | null;
  locationNotice?: string | null;
  locationPermission: LocationPermissionState;
  onFindDriver: () => void;
  onAcceptCounter: () => void;
  onDeclineCounter: () => void;
  onCancel: () => Promise<void> | void;
};

const statusCopy: Record<RideStatus, string> = {
  pending: "Ready to request",
  searching: "Searching",
  reviewing: "Drivers reviewing your offer",
  accepted: "Driver accepted",
  countered: "Driver countered",
  cancelled: "Cancelled"
};

const locationCopy: Record<LocationPermissionState, string> = {
  unknown: "Browser popup will ask for location",
  requesting: "Waiting for browser permission",
  granted: "Location is on",
  denied: "Location is off"
};

export function RideRequestCard({
  draft,
  status,
  counterOfferJmd,
  locationNotice,
  locationPermission,
  onFindDriver,
  onAcceptCounter,
  onDeclineCounter,
  onCancel
}: RideRequestCardProps) {
  return (
    <section className="linride-card-dark">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Offers</p>
          <h3 className="text-xl font-black">{statusCopy[status]}</h3>
          <p className="mt-1 text-xs font-bold text-white/56">Driver/rider responses appear here in real time.</p>
        </div>
        <Clock3 size={23} className="text-white/72" />
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex gap-3">
          <Route className="mt-1 shrink-0 text-linred" size={18} />
          <div>
            <p className="font-bold">{draft.pickup.name}</p>
            <p className="text-white/56">to {draft.destination.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <CreditCard className="mt-1 shrink-0 text-linred" size={18} />
          <div>
            <p className="font-bold">${draft.offeredFareJmd.toLocaleString()} JMD - {draft.paymentMethod}</p>
            <p className="text-white/56">{draft.vehicleType} - {draft.serviceType}</p>
          </div>
        </div>
        {(draft.pickupLandmark || draft.dropoffLandmark || draft.customerNotes || draft.scheduledTime) && (
          <div className="rounded-2xl bg-white/10 px-3 py-3">
            {draft.scheduledTime && <p className="font-bold">Scheduled: {new Date(draft.scheduledTime).toLocaleString()}</p>}
            {draft.pickupLandmark && <p className="text-white/66">Pickup note: {draft.pickupLandmark}</p>}
            {draft.dropoffLandmark && <p className="text-white/66">Drop-off note: {draft.dropoffLandmark}</p>}
            {draft.customerNotes && <p className="text-white/66">Passenger note: {draft.customerNotes}</p>}
          </div>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-white/10 px-3 py-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Pickup location</p>
        <p className="mt-1 text-sm font-bold">{locationCopy[locationPermission]}</p>
      </div>
      {locationNotice && (
        <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/76">{locationNotice}</p>
      )}
      {status === "countered" && counterOfferJmd && (
        <div className="mt-5 rounded-2xl border border-white/12 bg-white/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Driver counter offer</p>
          <p className="mt-1 text-2xl font-black">${counterOfferJmd.toLocaleString()} JMD</p>
          <p className="mt-1 text-sm text-white/62">You can accept this fare or keep searching for another driver.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAcceptCounter}
              className="rounded-2xl bg-linred px-4 py-3 text-sm font-black text-ink shadow-soft"
            >
              Accept Counter
            </button>
            <button
              type="button"
              onClick={onDeclineCounter}
              className="rounded-2xl bg-[rgb(255_255_255)] px-4 py-3 text-sm font-black text-ink shadow-soft"
            >
              Decline
            </button>
          </div>
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onFindDriver} className="rounded-2xl bg-linred px-4 py-3 text-sm font-black text-ink">
          Find Driver
        </button>
        <button
          type="button"
          onClick={() => void Promise.resolve(onCancel()).catch(() => undefined)}
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
