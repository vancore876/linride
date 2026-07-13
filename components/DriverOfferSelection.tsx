"use client";

import { useState } from "react";
import { Car, Check, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { DriverOffer, RideRequestDraft } from "@/types/linride";

type DriverOfferSelectionProps = {
  offers: DriverOffer[];
  draft: RideRequestDraft;
  onSelect: (offer: DriverOffer) => void;
  onDecline?: (offer: DriverOffer) => Promise<void> | void;
};

export function DriverOfferSelection({ offers, draft, onSelect, onDecline }: DriverOfferSelectionProps) {
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingOffers = offers.filter((offer) => offer.status === "pending");
  if (pendingOffers.length === 0) return null;

  return (
    <section className="linride-card driver-offer-selection" aria-live="polite">
      <div className="driver-offer-heading">
        <div>
          <p className="linride-eyebrow">Nearby drivers responded</p>
          <h3>Choose your driver</h3>
          <p>Compare the driver, vehicle, plate, and fare before selecting.</p>
        </div>
        <span>{pendingOffers.length} available</span>
      </div>
      <div className="driver-offer-grid">
        {pendingOffers.map((offer) => {
          const driver = offer.driver;
          const fare = offer.fareJmd ?? draft.offeredFareJmd;
          return (
            <article key={offer.id} className="driver-offer-card">
              <div className="driver-offer-person">
                {driver.profile.avatarUrl ? (
                  <Image unoptimized width={52} height={52} src={driver.profile.avatarUrl} alt={`${driver.profile.fullName} profile`} />
                ) : (
                  <span>{driver.profile.fullName.slice(0, 1).toUpperCase()}</span>
                )}
                <div>
                  <strong>{driver.profile.fullName}</strong>
                  <small><ShieldCheck size={13} /> Verified driver</small>
                </div>
              </div>
              <div className="driver-offer-vehicle">
                <Car size={17} />
                <span>{driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}</span>
                <b>{driver.plateNumber}</b>
              </div>
              <div className="driver-offer-price">
                <span>{offer.offerType === "counter" ? "Driver's price" : "Accepted your fare"}</span>
                <strong>J${fare.toLocaleString()}</strong>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button type="button" onClick={() => onSelect(offer)} className="linride-submit">
                  <Check size={17} className="mr-2 inline" /> Choose {driver.profile.fullName.split(" ")[0]}
                </button>
                {onDecline && (
                  <button
                    type="button"
                    disabled={decliningId === offer.id}
                    aria-label={`Decline offer from ${driver.profile.fullName}`}
                    title="Decline this offer"
                    onClick={async () => {
                      setDecliningId(offer.id);
                      setError(null);
                      try {
                        await onDecline(offer);
                      } catch (actionError) {
                        setError(actionError instanceof Error ? actionError.message : "This offer could not be declined.");
                      } finally {
                        setDecliningId(null);
                      }
                    }}
                    className="rounded-2xl bg-smoke px-4 text-charcoal disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {error && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{error}</p>}
    </section>
  );
}
