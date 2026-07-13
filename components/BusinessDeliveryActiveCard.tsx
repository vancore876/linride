"use client";

import { useState } from "react";
import { Camera, CheckCircle2, PackageCheck, Truck, XCircle } from "lucide-react";
import { BusinessDelivery } from "@/types/linride";

type BusinessDeliveryActiveCardProps = {
  delivery: BusinessDelivery;
  busy?: boolean;
  onProgress: (status: BusinessDelivery["status"], reason?: string) => Promise<void> | void;
  onUploadProof?: (file: File) => Promise<void> | void;
};

export function BusinessDeliveryActiveCard({ delivery, busy = false, onProgress, onUploadProof }: BusinessDeliveryActiveCardProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  async function runAction(action: () => Promise<void> | void) {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update delivery. Check your internet.");
    }
  }
  const next = delivery.status === "Accepted"
    ? { label: "Start pickup", status: "Picking up" as const, icon: Truck }
    : delivery.status === "Picking up"
      ? { label: "Package picked up", status: "Picked up" as const, icon: PackageCheck }
      : delivery.status === "Picked up"
        ? { label: "Start delivery", status: "Delivering" as const, icon: Truck }
        : delivery.status === "Delivering"
          ? { label: "Mark delivered", status: "Delivered" as const, icon: CheckCircle2 }
          : null;

  return (
    <section className="linride-card">
      <p className="linride-eyebrow">Active business delivery</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h3>{delivery.pickupBusinessName || delivery.businessName}</h3>
          <p className="linride-card-desc mb-0">{delivery.pickupAddress} to {delivery.dropoffAddress}</p>
        </div>
        <span className="linride-status-badge linride-status-active">{delivery.status}</span>
      </div>
      <div className="mt-3 rounded-2xl bg-smoke p-3 text-sm font-bold text-charcoal/70">
        <p>{delivery.packageDetails}</p>
        <p className="mt-1">Delivery offer: J${delivery.deliveryOfferJmd.toLocaleString()}</p>
        {delivery.cashCollectionRequired && <p className="mt-1">Collect cash: J${(delivery.cashCollectionAmountJmd || 0).toLocaleString()}</p>}
      </div>

      {next && (
        <button type="button" disabled={busy} onClick={() => void runAction(() => onProgress(next.status))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-linred px-3 py-3 text-sm font-black text-ink disabled:opacity-40">
          <next.icon size={18} /> {busy ? "Updating..." : next.label}
        </button>
      )}

      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-smoke px-3 py-3 text-xs font-black">
        <Camera size={16} className="text-linred" /> Upload optional proof
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void runAction(() => onUploadProof?.(file));
            event.currentTarget.value = "";
          }}
        />
      </label>

      {next && (
        <button type="button" onClick={() => setShowCancel((current) => !current)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-charcoal">
          <XCircle size={16} /> Cancel delivery
        </button>
      )}
      {showCancel && next && (
        <div className="mt-2 rounded-2xl bg-smoke p-3">
          <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="linride-textarea" placeholder="Why are you cancelling?" />
          <button type="button" disabled={busy || cancelReason.trim().length < 4} onClick={() => void runAction(() => onProgress("Cancelled", cancelReason.trim()))} className="mt-2 w-full rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white disabled:opacity-40">Confirm cancellation</button>
        </div>
      )}
      {actionError && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{actionError}</p>}
    </section>
  );
}
