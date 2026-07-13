import { useState } from "react";
import { Camera, CheckCircle2, Flag, MapPinCheck, Navigation, PlayCircle, Star, XCircle } from "lucide-react";
import { TripPinCard } from "@/components/TripPinCard";
import { TripRecord, TripStatus } from "@/types/linride";

type DriverActiveJobCardProps = {
  trip?: TripRecord | null;
  busy?: boolean;
  message?: string | null;
  onStatusChange?: (status: TripStatus, reason?: string) => Promise<void> | void;
  onVerifyPin?: (pin: string) => Promise<void> | void;
  onUploadProof?: (file: File) => Promise<void> | void;
  rated?: boolean;
  onRate?: (rating: number, comment: string, badges: string[]) => Promise<void> | void;
  onReport?: (reason: string, details: string) => Promise<void> | void;
};

const statusLabels: Record<TripStatus, string> = {
  requested: "Requested",
  offered: "Offer sent",
  accepted: "Accepted",
  driver_arriving: "Driving to pickup",
  arrived: "Arrived at pickup",
  in_progress: "Trip in progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

export function DriverActiveJobCard({ trip, busy = false, message, onStatusChange, onVerifyPin, onUploadProof, rated = false, onRate, onReport }: DriverActiveJobCardProps) {
  const [proofFileName, setProofFileName] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBadges, setRatingBadges] = useState<string[]>([]);
  const [ratingSaved, setRatingSaved] = useState(rated);
  const [showReport, setShowReport] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void> | void) {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update this job. Check your internet.");
      return false;
    }
  }

  if (!trip) {
    return (
      <section className="rounded-3xl bg-white p-4 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Active job</p>
        <h3 className="mt-1 text-xl font-black">No active trip</h3>
        <p className="mt-2 text-sm font-semibold text-charcoal/58">Accepted rides appear here with the next action in order.</p>
      </section>
    );
  }

  const nextAction = trip.status === "accepted"
    ? { label: "Start driving to pickup", status: "driver_arriving" as TripStatus, icon: Navigation }
    : trip.status === "driver_arriving"
      ? { label: "I have arrived", status: "arrived" as TripStatus, icon: MapPinCheck }
      : trip.status === "arrived" && trip.pinVerified
        ? { label: "Start trip", status: "in_progress" as TripStatus, icon: PlayCircle }
        : trip.status === "in_progress"
          ? { label: "Complete trip", status: "completed" as TripStatus, icon: CheckCircle2 }
          : null;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Active job</p>
        <h3 className="text-xl font-black">Trip and delivery controls</h3>
        <p className="mt-1 text-sm font-semibold text-charcoal/58">
          Follow each step in order. Passenger and driver screens update automatically.
        </p>
      </div>

      <p className="rounded-2xl bg-smoke px-3 py-3 text-sm font-black text-charcoal/70">
        Status: {statusLabels[trip.status]}
      </p>
      {(trip.pickupName || trip.destinationName) && (
        <p className="mt-2 rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/65">
          {trip.pickupName || "Pickup"} to {trip.destinationName || "Destination"}
        </p>
      )}

      {trip.status === "arrived" && (
        <div className="mt-3">
          <TripPinCard mode="verify" verified={trip.pinVerified} message={message} onVerify={(pin) => void runAction(() => onVerifyPin?.(pin))} />
        </div>
      )}

      {nextAction && (
        <button
          type="button"
          onClick={() => void runAction(() => onStatusChange?.(nextAction.status))}
          disabled={busy || (nextAction.status === "in_progress" && !trip.pinVerified)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-linred px-3 py-3 text-sm font-black text-ink disabled:opacity-40"
        >
          <nextAction.icon size={18} />
          {busy ? "Updating..." : nextAction.label}
        </button>
      )}

      {trip.status !== "completed" && trip.status !== "cancelled" && (
        <button
          type="button"
          onClick={() => setShowCancel((current) => !current)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-smoke px-3 py-3 text-xs font-black text-charcoal"
        >
          <XCircle size={16} />
          Cancel trip
        </button>
      )}

      {showCancel && trip.status !== "completed" && trip.status !== "cancelled" && (
        <div className="mt-3 rounded-2xl border border-linred/20 bg-linred/10 p-3">
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="min-h-20 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
            placeholder="Why are you cancelling?"
          />
          <button
            type="button"
            disabled={busy || cancelReason.trim().length < 4}
            onClick={() => void runAction(() => onStatusChange?.("cancelled", cancelReason.trim()))}
            className="mt-2 w-full rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white disabled:opacity-40"
          >
            Confirm cancellation
          </button>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-smoke px-3 py-3 text-sm font-black">
        <span className="flex items-center gap-2">
          <Camera size={17} className="text-linred" />
          Upload proof of delivery
        </span>
        <span className="text-[11px] font-black text-charcoal/55">{proofFileName || "Optional"}</span>
        <input
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setProofFileName(file?.name || "");
            if (file) void runAction(() => onUploadProof?.(file));
            event.currentTarget.value = "";
          }}
        />
      </label>
      {message && trip.status !== "arrived" && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{message}</p>}
      {actionError && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{actionError}</p>}

      {trip.status === "completed" && (
        <div className="mt-4 border-t border-black/10 pt-4">
          {ratingSaved ? (
            <p className="rounded-2xl bg-linred/10 px-3 py-3 text-sm font-black">Passenger rating submitted.</p>
          ) : (
            <>
              <p className="text-sm font-black">Rate the passenger</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`} className="p-1">
                    <Star size={25} className={value <= rating ? "fill-linred text-linred" : "text-charcoal/25"} />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Respectful", "Ready on time", "Paid correctly", "Clear directions"].map((badge) => (
                  <button key={badge} type="button" onClick={() => setRatingBadges((current) => current.includes(badge) ? current.filter((item) => item !== badge) : [...current, badge])} className={`linride-pill ${ratingBadges.includes(badge) ? "linride-pill-active" : ""}`}>{badge}</button>
                ))}
              </div>
              <textarea value={ratingComment} onChange={(event) => setRatingComment(event.target.value)} className="linride-textarea mt-2" placeholder="Optional comment" />
              <button
                type="button"
                disabled={!rating || busy}
                onClick={async () => {
                  if (await runAction(() => onRate?.(rating, ratingComment.trim(), ratingBadges))) setRatingSaved(true);
                }}
                className="mt-2 w-full rounded-2xl bg-linred px-3 py-3 text-sm font-black text-ink disabled:opacity-40"
              >
                Submit passenger rating
              </button>
            </>
          )}
          <button type="button" onClick={() => setShowReport((current) => !current)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-smoke px-3 py-3 text-xs font-black">
            <Flag size={16} /> Report a trip issue
          </button>
          {showReport && (
            <div className="mt-2 rounded-2xl bg-smoke p-3">
              <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="linride-textarea" placeholder="What happened?" />
              <button
                type="button"
                disabled={reportDetails.trim().length < 4 || busy}
                onClick={async () => {
                  if (await runAction(() => onReport?.("Trip issue", reportDetails.trim()))) {
                    setReportDetails("");
                    setShowReport(false);
                  }
                }}
                className="mt-2 w-full rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white disabled:opacity-40"
              >
                Submit report
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
