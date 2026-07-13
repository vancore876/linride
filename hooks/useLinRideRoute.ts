"use client";

import { useCallback, useEffect, useState } from "react";
import { Place, RouteDetails } from "@/types/linride";

function validPlace(place?: Place) {
  return Boolean(
    place && Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) > 0.001 && Math.abs(place.lng) > 0.001
  );
}

export function useLinRideRoute(origin?: Place, destination?: Place) {
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!validPlace(origin) || !validPlace(destination)) {
      setRoute(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { latitude: origin?.lat, longitude: origin?.lng },
            destination: { latitude: destination?.lat, longitude: destination?.lng }
          }),
          signal: controller.signal
        });
        const data = (await response.json()) as RouteDetails & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not calculate this route.");
        setRoute(data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setRoute(null);
        setError(requestError instanceof Error ? requestError.message : "Could not calculate this route.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [destination?.lat, destination?.lng, origin?.lat, origin?.lng, refreshKey]);

  return { route, loading, error, refresh };
}
