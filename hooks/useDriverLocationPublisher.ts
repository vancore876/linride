"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type LastPosition = { latitude: number; longitude: number; sentAt: number };

function movedMeters(previous: LastPosition, latitude: number, longitude: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(latitude - previous.latitude);
  const lngDelta = toRadians(longitude - previous.longitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(previous.latitude)) * Math.cos(toRadians(latitude)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function headingBetween(previous: LastPosition, latitude: number, longitude: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const fromLat = toRadians(previous.latitude);
  const toLat = toRadians(latitude);
  const lngDelta = toRadians(longitude - previous.longitude);
  const y = Math.sin(lngDelta) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(lngDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function useDriverLocationPublisher(driverId: string | undefined, online: boolean) {
  const [status, setStatus] = useState<"idle" | "tracking" | "denied" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<number | null>(null);

  useEffect(() => {
    const client = supabase;
    if (driverId && client && !online) {
      void client.from("driver_locations").update({ is_online: false, is_available: false, updated_at: new Date().toISOString() }).eq("driver_id", driverId);
    }
    if (!driverId || !online || !client) {
      setStatus("idle");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setMessage("Live GPS is not available on this device. You cannot go online yet.");
      return;
    }

    let last: LastPosition | null = null;
    let stopped = false;
    const publish = async (position: GeolocationPosition) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;
      const now = Date.now();
      const distance = last ? movedMeters(last, latitude, longitude) : 0;
      const elapsedSeconds = last ? Math.max(1, (now - last.sentAt) / 1000) : 0;
      if (last && now - last.sentAt < 4500 && distance < 12) return;
      const liveHeading = Number.isFinite(heading) && heading != null ? heading : last && distance > 3 ? headingBetween(last, latitude, longitude) : null;
      const liveSpeed = Number.isFinite(speed) && speed != null ? speed : last && distance > 0 ? distance / elapsedSeconds : null;

      const { error } = await client.rpc("set_driver_location", {
        p_driver_id: driverId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_heading: liveHeading,
        p_speed: liveSpeed,
        p_accuracy: accuracy,
        p_is_online: true,
        p_is_available: true
      });
      if (stopped) return;
      if (error) {
        setStatus("error");
        setMessage("Your live location could not be shared.");
        return;
      }
      last = { latitude, longitude, sentAt: now };
      setLastPublishedAt(now);
      setStatus("tracking");
      setMessage("Live GPS is updating for nearby passengers.");
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => void publish(position),
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        setMessage(error.code === error.PERMISSION_DENIED ? "Allow GPS to go online." : "Driver GPS is temporarily unavailable.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
      if (last) {
        void client.rpc("set_driver_location", {
          p_driver_id: driverId,
          p_latitude: last.latitude,
          p_longitude: last.longitude,
          p_heading: null,
          p_speed: null,
          p_accuracy: null,
          p_is_online: false,
          p_is_available: false
        });
      }
    };
  }, [driverId, online]);

  return { status, message, lastPublishedAt };
}
