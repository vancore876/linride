import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { BusinessDelivery } from "@/types/linride";

type BusinessDeliveryPopupProps = {
  delivery: BusinessDelivery;
  onAccept: () => void;
  onCounter?: (fareJmd: number) => void;
  onIgnore: () => void;
};

export function BusinessDeliveryPopup({ delivery, onAccept, onCounter, onIgnore }: BusinessDeliveryPopupProps) {
  const [counterFare, setCounterFare] = useState(delivery.deliveryOfferJmd + 200);
  const [showCounter, setShowCounter] = useState(false);

  return (
    <section className="rounded-3xl border-2 border-linred bg-white p-4 shadow-lift">
      <div className="mb-3 flex items-start gap-3">
        <span className="rounded-2xl bg-linred p-3 text-ink">
          <PackageCheck size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">New Business Delivery</p>
          <h3 className="text-xl font-black">A business near Linstead needs a driver.</h3>
        </div>
      </div>
      <div className="space-y-2 text-sm font-bold text-charcoal/75">
        <p>{delivery.pickupBusinessName || delivery.businessName}</p>
        <p>Pickup: {delivery.pickupAddress}</p>
        <p>Drop-off: {delivery.dropoffAddress}</p>
        <p>Order: {delivery.packageDetails}</p>
        <p>Offer: ${delivery.deliveryOfferJmd.toLocaleString()} JMD</p>
        <p>Cash collection: {delivery.cashCollectionRequired ? `Yes - $${(delivery.cashCollectionAmountJmd || 0).toLocaleString()} JMD` : "No"}</p>
        <p>Notes: {delivery.notes}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={onAccept} className="rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink">
          Accept Delivery
        </button>
        <button type="button" onClick={() => setShowCounter((current) => !current)} className="rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white">
          Counter Offer
        </button>
        <button type="button" onClick={onIgnore} className="rounded-2xl bg-smoke px-3 py-3 text-xs font-black">
          Ignore
        </button>
      </div>
      {showCounter && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-smoke p-3">
          <input
            type="number"
            min={500}
            step={100}
            value={counterFare}
            onChange={(event) => setCounterFare(Number(event.target.value))}
            className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-black"
            aria-label="Counter offer in JMD"
          />
          <button type="button" disabled={counterFare < 1} onClick={() => onCounter?.(counterFare)} className="rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink disabled:opacity-40">
            Send J${counterFare.toLocaleString()}
          </button>
        </div>
      )}
    </section>
  );
}
