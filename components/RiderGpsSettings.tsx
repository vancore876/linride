"use client";

import { AlertTriangle, CheckCircle2, Crosshair, LocateFixed, MapPin, Radio, Square } from "lucide-react";
import type { Place } from "@/types/linride";

type Props = {
  permission: "unknown" | "requesting" | "granted" | "denied";
  notice?: string | null;
  candidate?: Place | null;
  livePosition?: Place | null;
  tracking: boolean;
  pickupFollowsGps: boolean;
  updatedAt?: number | null;
  onRetry: () => void;
  onStop: () => void;
  onFineTunePickup: () => void;
  onAcceptCandidate: () => void;
  onRejectCandidate: () => void;
};

/** Rider GPS controls stay in the navigation drawer, not in the booking flow. */
export function RiderGpsSettings({
  permission, notice, candidate, livePosition, tracking, pickupFollowsGps, updatedAt,
  onRetry, onStop, onFineTunePickup, onAcceptCandidate, onRejectCandidate
}: Props) {
  const accuracy = livePosition?.accuracyMeters;
  const hasAccuracy = tracking && typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > 0;

  return (
    <section className="lr6-gps-settings" aria-label="Location and GPS settings">
      <div className="lr6-gps-status">
        <span className={`lr6-gps-indicator ${tracking ? "is-live" : ""}`}><Radio size={15} /> {tracking ? "Live GPS on" : "GPS not tracking"}</span>
        {hasAccuracy && <strong>±{Math.round(accuracy)} m</strong>}
      </div>
      <p className="lr6-gps-description">
        {notice || (tracking ? "Your blue dot moves as the phone reports new positions." : "Allow location and use Start GPS to follow your position on the map.")}
      </p>
      {tracking && (
        <p className="lr6-gps-helper">
          {pickupFollowsGps ? "Your suggested pickup follows GPS until you confirm a trip or set a pin." : "Your current position updates independently of your saved pickup."}
        </p>
      )}
      {hasAccuracy && accuracy > 100 && <p className="lr6-gps-warning"><AlertTriangle size={14} /> GPS is approximate. Fine-tune the pickup pin before booking.</p>}
      {permission === "denied" && <p className="lr6-gps-warning"><AlertTriangle size={14} /> Enable Precise Location for this website in browser settings.</p>}
      {updatedAt && tracking && <small className="lr6-gps-updated">Last GPS update: {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small>}

      <div className="lr6-gps-actions">
        <button type="button" onClick={onRetry} disabled={permission === "requesting"}><LocateFixed size={16} /> {permission === "requesting" ? "Locating…" : tracking ? "Refresh GPS" : "Start live GPS"}</button>
        <button type="button" onClick={onFineTunePickup}><MapPin size={16} /> Fine-tune pickup on map</button>
        {tracking && <button type="button" onClick={onStop}><Square size={15} /> Stop tracking</button>}
      </div>

      {candidate && (
        <div className="lr6-gps-candidate" role="alert">
          <strong><Crosshair size={16} /> Confirm GPS position</strong>
          <p>{candidate.name}</p>
          <small>{candidate.hint || "Your phone returned an approximate position."}</small>
          <div>
            <button type="button" onClick={onAcceptCandidate}><CheckCircle2 size={16} /> Use this position</button>
            <button type="button" onClick={onRejectCandidate}>Keep current pickup</button>
          </div>
        </div>
      )}
      <small className="lr6-gps-note">GPS accuracy depends on your device and signal. Tracking pauses when you leave the rider view or your browser suspends the page.</small>
    </section>
  );
}
