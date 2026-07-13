"use client";

import { ArrowDown, Clock3, Gauge, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { Place, RouteEstimate } from "@/types/linride";
import { searchJamaicaLocations } from "@/lib/maps/geoapify";

type RouteDistanceCardProps = {
  pickup: Place;
  destination: Place;
  onEstimateChange?: (estimate: RouteEstimate | null) => void;
  compact?: boolean;
};

export function RouteDistanceCard({ pickup, destination, onEstimateChange, compact = false }: RouteDistanceCardProps) {
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!pickup.name.trim() || !destination.name.trim()) {
      setEstimate(null);
      setStatus("idle");
      onEstimateChange?.(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setMessage("");
      try {
        const resolvePlace = async (place: Place) => {
          if (place.hint !== "Typed location" && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat && place.lng) {
            return { label: place.name, lat: place.lat, lng: place.lng };
          }
          const result = (await searchJamaicaLocations(place.name, controller.signal))[0];
          if (!result) throw new Error(`We could not find "${place.name}" in Jamaica.`);
          return { label: result.formatted, lat: result.latitude, lng: result.longitude };
        };
        const [resolvedPickup, resolvedDestination] = await Promise.all([resolvePlace(pickup), resolvePlace(destination)]);
        const response = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { latitude: resolvedPickup.lat, longitude: resolvedPickup.lng },
            destination: { latitude: resolvedDestination.lat, longitude: resolvedDestination.lng }
          }),
          signal: controller.signal
        });
        const route = (await response.json()) as { distanceMeters?: number; durationSeconds?: number; error?: string };
        if (!response.ok || !route.distanceMeters || !route.durationSeconds) throw new Error(route.error || "Could not calculate this trip.");
        const data: RouteEstimate = {
          distanceKm: Number((route.distanceMeters / 1000).toFixed(1)),
          distanceMiles: Number((route.distanceMeters / 1609.344).toFixed(1)),
          durationMinutes: Math.max(1, Math.round(route.durationSeconds / 60)),
          pickupLabel: resolvedPickup.label,
          destinationLabel: resolvedDestination.label,
          pickupCoordinates: { lat: resolvedPickup.lat, lng: resolvedPickup.lng },
          destinationCoordinates: { lat: resolvedDestination.lat, lng: resolvedDestination.lng },
          source: "road"
        };
        setEstimate(data);
        setStatus("ready");
        onEstimateChange?.(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setEstimate(null);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not calculate this trip.");
        onEstimateChange?.(null);
      }
    }, 550);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [destination, onEstimateChange, pickup]);

  return (
    <section className={`route-summary ${compact ? "route-summary-compact" : ""}`} aria-live="polite">
      <div className="route-summary-locations">
        <span className="route-point route-point-start"><Navigation size={17} /></span>
        <div>
          <span className="route-kicker">Pickup</span>
          <strong>{pickup.name || "Enter pickup"}</strong>
        </div>
        <ArrowDown className="route-arrow" size={18} />
        <span className="route-point route-point-end"><MapPin size={17} /></span>
        <div>
          <span className="route-kicker">Destination</span>
          <strong>{destination.name || "Enter destination"}</strong>
        </div>
      </div>

      <div className="route-summary-metrics">
        {status === "loading" && <div className="route-loading"><span /> Calculating road distance...</div>}
        {status === "error" && <div className="route-error">{message}</div>}
        {(status === "idle" || (!estimate && status !== "error" && status !== "loading")) && (
          <div className="route-empty">Your trip distance will appear here.</div>
        )}
        {estimate && status === "ready" && (
          <>
            <div className="route-primary-metric">
              <Gauge size={21} />
              <span><b>{estimate.distanceKm}</b> km</span>
              <small>{estimate.distanceMiles} miles</small>
            </div>
            <div className="route-time"><Clock3 size={18} /><span>About <b>{estimate.durationMinutes} min</b></span></div>
          </>
        )}
      </div>
      <p className="route-attribution">
        {estimate?.source === "direct" ? "Estimated direct distance" : "Driving distance using OpenStreetMap road data"}
      </p>
    </section>
  );
}
