"use client";

import { useCallback, useState } from "react";
import { reverseGeocodeJamaica } from "@/lib/maps/geoapify";
import { formatLocationAccuracy, geolocationErrorCode, getPreciseCurrentPosition } from "@/lib/maps/geolocation";
import { Place } from "@/types/linride";

export type LocationStatus = "idle" | "requesting" | "loading" | "success" | "denied" | "unavailable" | "timeout" | "error";

export function useCurrentLocation(onLocation: (place: Place) => void) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setMessage("GPS is not available on this device. Search or drop a pin instead.");
      return;
    }

    setStatus("requesting");
    setMessage("Allow location access so Lin Ride can find your pickup.");
    try {
      const position = await getPreciseCurrentPosition({
        onSample: (sample) => setMessage(`Improving GPS accuracy... about ${formatLocationAccuracy(sample.coords.accuracy)}.`)
      });
      setStatus("loading");
      const { latitude, longitude, accuracy } = position.coords;
      const accuracyLabel = formatLocationAccuracy(accuracy);
      setMessage("Finding the nearest mapped address...");
      const place = await reverseGeocodeJamaica(latitude, longitude).catch(() => ({
        name: "My current GPS location",
        lat: latitude,
        lng: longitude
      }));
      onLocation({ ...place, lat: latitude, lng: longitude, accuracyMeters: accuracy, hint: `GPS accuracy: about ${accuracyLabel}` });
      setStatus("success");
      setMessage(`Pickup set within about ${accuracyLabel}.`);
    } catch (error) {
      const code = geolocationErrorCode(error);
      setStatus(code === 1 ? "denied" : code === 3 ? "timeout" : "error");
      setMessage(code === 1 ? "Location permission is off. Search or drop a pin instead." : "GPS could not get a reliable reading. Move near a window and try again.");
    }
  }, [onLocation]);

  return { status, message, requestLocation };
}
