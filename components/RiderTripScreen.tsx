"use client";

import { useState } from "react";
import { Check, Flag, Share2, Star, XCircle } from "lucide-react";
import Image from "next/image";
import { DriverBadgeList } from "@/components/DriverBadgeList";
import { Driver, RideRequestDraft, TripRecord, TripStatus } from "@/types/linride";

type RiderTripScreenProps = {
  driver: Driver;
  draft: RideRequestDraft;
  trip?: TripRecord | null;
  rated?: boolean;
  onCancel?: (reason: string) => Promise<void> | void;
  onRate?: (rating: number, comment: string, badges: string[]) => Promise<void> | void;
  onReport?: (reason: string, details: string) => Promise<void> | void;
};

const statusLabels: Record<TripStatus, string> = {
  requested: "Request sent",
  offered: "Driver offered",
  accepted: "Driver accepted",
  driver_arriving: "Driver is on the way",
  arrived: "Driver has arrived",
  in_progress: "Trip in progress",
  completed: "Trip completed",
  cancelled: "Trip cancelled"
};

const ratingBadges = ["Clean vehicle", "Polite", "Safe driving", "On time", "Helpful"];

export function RiderTripScreen({ driver, draft, trip, rated = false, onCancel, onRate, onReport }: RiderTripScreenProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("Trip issue");
  const [reportDetails, setReportDetails] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [badges, setBadges] = useState<string[]>([]);
  const [submittedRating, setSubmittedRating] = useState(rated);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const phoneHref = `tel:${driver.profile.phone.replace(/[^\d+]/g, "")}`;
  const shareText = [
    "I am travelling with Lin Ride.",
    `${draft.pickup.name} to ${draft.destination.name}.`,
    `Driver: ${driver.profile.fullName}, plate ${driver.plateNumber}.`,
    trip ? `Trip status: ${statusLabels[trip.status]}.` : ""
  ].filter(Boolean).join(" ");
  const shareHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const canCancel = !trip || ["accepted", "driver_arriving", "arrived"].includes(trip.status);
  const driverDetails = [
    { label: "Driver name", value: driver.profile.fullName },
    { label: "License plate", value: driver.plateNumber },
    { label: "Driver ID", value: driver.id },
    { label: "Phone number", value: driver.profile.phone, href: phoneHref }
  ];

  async function submitRating() {
    if (!rating) return;
    setBusy(true);
    setActionError(null);
    try {
      await onRate?.(rating, comment.trim(), badges);
      setSubmittedRating(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Your rating could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="linride-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {driver.profile.avatarUrl ? (
            <Image unoptimized width={56} height={56} src={driver.profile.avatarUrl} alt={`${driver.profile.fullName} profile`} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-lg font-black text-white">{driver.profile.fullName.slice(0, 1)}</span>
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Your driver</p>
            <h3 className="text-2xl font-black">{driver.profile.fullName}</h3>
            <p className="text-sm font-semibold text-charcoal/60">{trip ? statusLabels[trip.status] : "Driver accepted"}</p>
          </div>
        </div>
        <div className="linride-status-badge linride-status-pending">{driver.plateNumber}</div>
      </div>

      {trip && (
        <div className="mb-3 grid grid-cols-4 gap-1" aria-label="Trip progress">
          {["accepted", "driver_arriving", "arrived", "in_progress"].map((status, index) => {
            const order = ["accepted", "driver_arriving", "arrived", "in_progress", "completed"];
            const reached = trip.status === "completed" || order.indexOf(trip.status) >= index;
            return <span key={status} className={`h-2 rounded-full ${reached ? "bg-linred" : "bg-charcoal/15"}`} />;
          })}
        </div>
      )}

      <div className="mb-3 grid gap-2 rounded-2xl border border-black/10 bg-linred/10 p-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Driver information</p>
        {driverDetails.map((detail) => (
          <div key={detail.label} className="linride-list-item flex items-center justify-between gap-3 py-2 text-sm">
            <span className="font-bold text-charcoal/58">{detail.label}</span>
            {detail.href ? (
              <a href={detail.href} className="text-right font-black text-charcoal underline decoration-linred/50 underline-offset-4">{detail.value}</a>
            ) : (
              <span className="text-right font-black text-charcoal">{detail.value}</span>
            )}
          </div>
        ))}
      </div>

      <div className="linride-list-item text-sm">
        <p className="font-black">{driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}</p>
        <p className="text-charcoal/60">Agreed fare: ${draft.offeredFareJmd.toLocaleString()} JMD - {draft.paymentMethod}</p>
      </div>
      <div className="mt-3"><DriverBadgeList badges={driver.badges} /></div>

      <div className={`mt-4 grid ${canCancel ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        <a href={shareHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-ink px-2 py-3 text-xs font-bold text-white">
          <Share2 size={18} />
          WhatsApp
        </a>
        <button type="button" onClick={() => setShowReport((current) => !current)} className="flex flex-col items-center gap-1 rounded-2xl bg-smoke px-2 py-3 text-xs font-bold text-charcoal">
          <Flag size={18} />
          Report
        </button>
        {canCancel && (
          <button type="button" onClick={() => setShowCancel((current) => !current)} className="flex flex-col items-center gap-1 rounded-2xl bg-linred px-2 py-3 text-xs font-bold text-ink">
            <XCircle size={18} />
            Cancel
          </button>
        )}
      </div>

      {showCancel && canCancel && (
        <div className="mt-3 rounded-2xl bg-smoke p-3">
          <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="linride-textarea" placeholder="Tell us why you need to cancel" />
          <button
            type="button"
            disabled={busy || cancelReason.trim().length < 4}
            onClick={async () => {
              setBusy(true);
              try { await onCancel?.(cancelReason.trim()); setShowCancel(false); } catch (error) { setActionError(error instanceof Error ? error.message : "Trip could not be cancelled."); } finally { setBusy(false); }
            }}
            className="mt-2 w-full rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white disabled:opacity-40"
          >
            Confirm cancellation
          </button>
        </div>
      )}

      {showReport && (
        <div className="mt-3 rounded-2xl bg-smoke p-3">
          <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-bold">
            <option>Trip issue</option>
            <option>Safety issue</option>
            <option>Driver behaviour</option>
            <option>Fare or payment issue</option>
            <option>Other</option>
          </select>
          <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="linride-textarea mt-2" placeholder="What happened?" />
          <button
            type="button"
            disabled={busy || reportDetails.trim().length < 4}
            onClick={async () => {
              setBusy(true);
              try { await onReport?.(reportReason, reportDetails.trim()); setShowReport(false); setReportDetails(""); } catch (error) { setActionError(error instanceof Error ? error.message : "Report could not be submitted."); } finally { setBusy(false); }
            }}
            className="mt-2 w-full rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink disabled:opacity-40"
          >
            Submit report
          </button>
        </div>
      )}

      {actionError && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{actionError}</p>}

      {trip?.status === "completed" && (
        <div className="mt-4 border-t border-black/10 pt-4">
          {submittedRating ? (
            <p className="flex items-center gap-2 rounded-2xl bg-linred/10 px-3 py-3 text-sm font-black text-charcoal"><Check size={18} className="text-linred" /> Rating submitted. Thank you.</p>
          ) : (
            <>
              <p className="text-sm font-black">Rate your driver</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`} className="p-1">
                    <Star size={27} className={value <= rating ? "fill-linred text-linred" : "text-charcoal/25"} />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ratingBadges.map((badge) => (
                  <button key={badge} type="button" onClick={() => setBadges((current) => current.includes(badge) ? current.filter((item) => item !== badge) : [...current, badge])} className={`linride-pill ${badges.includes(badge) ? "linride-pill-active" : ""}`}>{badge}</button>
                ))}
              </div>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="linride-textarea mt-2" placeholder="Optional comment" />
              <button type="button" disabled={!rating || busy} onClick={() => void submitRating()} className="mt-2 w-full rounded-2xl bg-linred px-3 py-3 text-sm font-black text-ink disabled:opacity-40">Submit rating</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
