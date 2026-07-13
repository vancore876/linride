import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { RouteDistanceCard } from "@/components/RouteDistanceCard";
import { SupportButton } from "@/components/SupportButton";
import { BusinessAccount, BusinessDelivery, BusinessDeliveryOffer, SupportTicket } from "@/types/linride";

type BusinessDeliveryFormProps = {
  delivery: BusinessDelivery;
  hasBusinessAccount: boolean;
  businessAccount?: BusinessAccount | null;
  deliveries?: BusinessDelivery[];
  counterOffers?: BusinessDeliveryOffer[];
  deliveryStatus: BusinessDelivery["status"];
  onCreateBusinessAccount: (business: { businessName: string; businessType: string; phone: string; address: string }) => void;
  onSubmitDelivery: (delivery: BusinessDelivery) => void;
  onCancelDelivery?: (deliveryId: string, reason: string) => Promise<void> | void;
  onAcceptCounterOffer?: (offerId: string) => Promise<void> | void;
  onReportDelivery?: (deliveryId: string, details: string) => Promise<void> | void;
  supportTickets?: SupportTicket[];
  onCreateSupportTicket?: (category: string, message: string) => Promise<void> | void;
};

export function BusinessDeliveryForm({
  delivery,
  hasBusinessAccount,
  businessAccount,
  deliveries = [],
  counterOffers = [],
  deliveryStatus,
  onCreateBusinessAccount,
  onSubmitDelivery,
  onCancelDelivery,
  onAcceptCounterOffer,
  onReportDelivery,
  supportTickets = [],
  onCreateSupportTicket
}: BusinessDeliveryFormProps) {
  const [form, setForm] = useState({
    businessName: "",
    businessType: "Restaurant",
    businessPhone: "",
    businessAddress: "",
    pickupBusinessName: "",
    pickupAddress: "",
    customerName: "",
    customerPhone: "",
    dropoffAddress: "",
    packageDetails: "",
    deliveryOfferJmd: "",
    cashCollectionRequired: "No",
    cashCollectionAmountJmd: "",
    notes: ""
  });

  const canSubmit = useMemo(() => {
    const required =
      form.pickupBusinessName.trim() &&
      form.pickupAddress.trim() &&
      form.customerName.trim() &&
      form.customerPhone.trim() &&
      form.dropoffAddress.trim() &&
      form.packageDetails.trim() &&
      form.deliveryOfferJmd.trim();
    const cashOk = form.cashCollectionRequired === "No" || form.cashCollectionAmountJmd.trim();
    return Boolean(required && cashOk);
  }, [form]);
  const pickupPlace = useMemo(
    () => ({ name: form.pickupAddress, lat: 0, lng: 0, hint: "Typed location" }),
    [form.pickupAddress]
  );
  const dropoffPlace = useMemo(
    () => ({ name: form.dropoffAddress, lat: 0, lng: 0, hint: "Typed location" }),
    [form.dropoffAddress]
  );
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});
  const [reportDetails, setReportDetails] = useState<Record<string, string>>({});

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (!hasBusinessAccount) {
    if (businessAccount) {
      const statusMessage = businessAccount.status === "pending"
        ? "Your account is waiting for admin approval. Delivery tools unlock after approval."
        : businessAccount.status === "rejected"
          ? "This business account was not approved. Contact support with updated business details."
          : "This business account is suspended. Contact support for the next step.";
      return (
        <section className="linride-screen">
          <div className="linride-card-dark">
            <p className="linride-eyebrow">Business delivery</p>
            <h2 className="mt-1 text-3xl font-black">{businessAccount.businessName}</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">{statusMessage}</p>
            <span className="mt-4 inline-flex rounded-full bg-linred px-3 py-2 text-xs font-black uppercase text-ink">{businessAccount.status}</span>
          </div>
          <div className="mt-4"><SupportButton tickets={supportTickets} onCreateTicket={onCreateSupportTicket} /></div>
        </section>
      );
    }
    return (
      <section className="linride-screen">
        <div className="linride-panel-grid">
        <div className="linride-card-dark">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Business delivery</p>
          <h2 className="mt-1 text-3xl font-black">Set up your business first.</h2>
          <p className="mt-3 text-sm leading-6 text-white/66">
            After admin approves the account, you can send delivery requests to nearby drivers.
          </p>
        </div>
        <div className="linride-card">
          <h3>Business details</h3>
          <p className="linride-card-desc">Add the name, phone, and pickup address for the business.</p>
          <div className="grid gap-3">
            <input value={form.businessName} onChange={(event) => update("businessName", event.target.value)} className="linride-input" placeholder="Business name" />
            <select value={form.businessType} onChange={(event) => update("businessType", event.target.value)} className="linride-select">
              <option>Restaurant</option>
              <option>Cook shop</option>
              <option>Grocery</option>
              <option>Pharmacy</option>
              <option>Hardware</option>
              <option>Boutique</option>
              <option>Phone store</option>
              <option>Other</option>
            </select>
            <input value={form.businessPhone} onChange={(event) => update("businessPhone", event.target.value)} className="linride-input" placeholder="Business phone" />
            <input value={form.businessAddress} onChange={(event) => update("businessAddress", event.target.value)} className="linride-input" placeholder="Business address" />
          </div>
          <button
            type="button"
            onClick={() =>
              onCreateBusinessAccount({
                businessName: form.businessName || "Lin Ride business",
                businessType: form.businessType,
                phone: form.businessPhone,
                address: form.businessAddress
              })
            }
            className="linride-submit mt-4"
          >
            Send for approval
          </button>
        </div>
        </div>
      </section>
    );
  }

  return (
    <section className="linride-screen">
      <div className="linride-card-dark mb-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Business delivery</p>
        <h2 className="mt-1 text-3xl font-black">{businessAccount?.businessName || delivery.businessName}</h2>
        <p className="mt-2 text-sm font-semibold text-white/64">{businessAccount?.businessType || delivery.businessType} - Approved business account</p>
      </div>

      {counterOffers.length > 0 && (
        <div className="linride-card mb-4">
          <h3>Driver counter offers</h3>
          <p className="linride-card-desc">Choose a driver and fare for your searching delivery.</p>
          <div className="space-y-2">
            {counterOffers.map((offer) => {
              const matchingDelivery = deliveries.find((item) => item.id === offer.deliveryId);
              return (
                <article key={offer.id} className="linride-list-item">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{offer.driver.profile.fullName} - {offer.driver.plateNumber}</p>
                      <p className="text-xs font-bold text-charcoal/55">{offer.driver.vehicleColor} {offer.driver.vehicleMake} {offer.driver.vehicleModel}</p>
                      {matchingDelivery && <p className="mt-1 text-xs font-bold text-charcoal/55">To {matchingDelivery.dropoffAddress}</p>}
                    </div>
                    <span className="linride-status-badge linride-status-active">J${offer.fareJmd.toLocaleString()}</span>
                  </div>
                  <button type="button" onClick={() => onAcceptCounterOffer?.(offer.id)} className="mt-3 w-full rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink">Accept this driver</button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="linride-panel-grid">
      <div className="linride-card">
        <div className="mb-4 flex items-center gap-3">
          <Store className="text-linred" />
          <div>
            <h3>Send a delivery</h3>
            <p className="linride-card-desc mb-0">Add customer details, package details, and your delivery offer.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <input value={form.pickupBusinessName} onChange={(event) => update("pickupBusinessName", event.target.value)} className="linride-input" placeholder="Example: Kim's Cook Shop" />
          <input value={form.pickupAddress} onChange={(event) => update("pickupAddress", event.target.value)} className="linride-input" placeholder="Example: Main Street, Linstead" />
          <div className="linride-row-2">
            <input value={form.customerName} onChange={(event) => update("customerName", event.target.value)} className="linride-input" placeholder="Example: Shanice Brown" />
            <input value={form.customerPhone} onChange={(event) => update("customerPhone", event.target.value)} className="linride-input" placeholder="Example: 876-000-0000" />
          </div>
          <input value={form.dropoffAddress} onChange={(event) => update("dropoffAddress", event.target.value)} className="linride-input" placeholder="Example: Treadways, near the shop" />
          {form.pickupAddress.trim() && form.dropoffAddress.trim() ? (
            <RouteDistanceCard pickup={pickupPlace} destination={dropoffPlace} compact />
          ) : null}
          <input value={form.packageDetails} onChange={(event) => update("packageDetails", event.target.value)} className="linride-input" placeholder="Example: 2 lunch boxes and 1 drink" />
          <div className="linride-row-2">
            <input value={form.deliveryOfferJmd} onChange={(event) => update("deliveryOfferJmd", event.target.value)} className="linride-input" placeholder="Example: $700" />
            <select value={form.cashCollectionRequired} onChange={(event) => update("cashCollectionRequired", event.target.value)} className="linride-select">
            <option>No</option>
            <option>Yes</option>
          </select>
          </div>
          <input value={form.cashCollectionAmountJmd} onChange={(event) => update("cashCollectionAmountJmd", event.target.value)} className="linride-input" placeholder="Example: $2,500 cash to collect" />
          <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="linride-textarea" placeholder="Example: Call passenger when nearby" />
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmitDelivery({
              ...delivery,
              pickupBusinessName: form.pickupBusinessName,
              pickupAddress: form.pickupAddress,
              customerName: form.customerName,
              customerPhone: form.customerPhone,
              dropoffAddress: form.dropoffAddress,
              packageDetails: form.packageDetails,
              deliveryOfferJmd: Number(form.deliveryOfferJmd.replace(/[^0-9]/g, "")),
              cashCollectionRequired: form.cashCollectionRequired === "Yes",
              cashCollectionAmountJmd: Number(form.cashCollectionAmountJmd.replace(/[^0-9]/g, "")),
              notes: form.notes,
              status: "Searching"
            })
          }
          className="linride-submit mt-4 disabled:bg-charcoal/25 disabled:text-charcoal/50"
        >
          We a search fi a driver
        </button>
        <p className="mt-3 rounded-2xl bg-smoke px-3 py-2 text-sm font-bold text-charcoal/65">Status: {deliveryStatus}</p>
      </div>

      <div className="linride-card">
        <h3>Deliveries</h3>
        <p className="linride-card-desc">
          Track active deliveries, cash collection, and completed jobs.
        </p>
        <div className="mt-4 space-y-2">
          {deliveries.length === 0 && <p className="linride-empty">No deliveries yet. Your first request will appear here.</p>}
          {deliveries.map((item) => (
            <article key={item.id} className="linride-list-item">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="linride-item-name">{item.customerName || "Customer delivery"}</p>
                  <p className="linride-item-meta mt-1">{item.pickupAddress} to {item.dropoffAddress}</p>
                  <p className="linride-item-meta mt-1">
                    Fee ${item.deliveryOfferJmd.toLocaleString()} JMD - Cash collect ${(item.cashCollectionAmountJmd || 0).toLocaleString()} JMD
                  </p>
                  {item.acceptedDriver && (
                    <p className="linride-item-meta mt-1">
                      Driver: {item.acceptedDriver.profile.fullName} - {item.acceptedDriver.plateNumber} - {item.acceptedDriver.profile.phone}
                    </p>
                  )}
                </div>
                <span className="linride-status-badge linride-status-active">{item.status}</span>
              </div>
              {item.id && !["Delivered", "Cancelled"].includes(item.status) && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-black text-linred">Cancel delivery</summary>
                  <textarea
                    value={cancelReason[item.id] || ""}
                    onChange={(event) => setCancelReason((current) => ({ ...current, [item.id!]: event.target.value }))}
                    className="linride-textarea mt-2"
                    placeholder="Why are you cancelling?"
                  />
                  <button
                    type="button"
                    disabled={(cancelReason[item.id] || "").trim().length < 4}
                    onClick={() => onCancelDelivery?.(item.id!, (cancelReason[item.id!] || "").trim())}
                    className="mt-2 rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    Confirm cancellation
                  </button>
                </details>
              )}
              {item.id && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-black text-charcoal/60">Report delivery issue</summary>
                  <textarea value={reportDetails[item.id] || ""} onChange={(event) => setReportDetails((current) => ({ ...current, [item.id!]: event.target.value }))} className="linride-textarea mt-2" placeholder="What happened?" />
                  <button type="button" disabled={(reportDetails[item.id] || "").trim().length < 4} onClick={() => onReportDelivery?.(item.id!, (reportDetails[item.id!] || "").trim())} className="mt-2 rounded-2xl bg-smoke px-3 py-2 text-xs font-black disabled:opacity-40">Submit report</button>
                </details>
              )}
            </article>
          ))}
        </div>
      </div>
      </div>
      <div className="mt-4"><SupportButton tickets={supportTickets} onCreateTicket={onCreateSupportTicket} /></div>
    </section>
  );
}
