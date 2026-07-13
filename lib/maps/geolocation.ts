export type PreciseLocationOptions = {
  timeoutMs?: number;
  targetAccuracyMeters?: number;
  onSample?: (position: GeolocationPosition) => void;
};

export function formatLocationAccuracy(accuracyMeters: number) {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return "unknown accuracy";
  if (accuracyMeters < 1000) {
    const rounded = Math.max(5, Math.round(accuracyMeters / 5) * 5);
    return `${rounded} m`;
  }
  const kilometers = accuracyMeters / 1000;
  return `${kilometers >= 10 ? Math.round(kilometers) : kilometers.toFixed(1)} km`;
}

export function geolocationErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = Number((error as { code?: unknown }).code);
  return Number.isFinite(code) ? code : null;
}

export function distanceBetweenCoordinatesMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(lat2 - lat1);
  const lngDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getPreciseCurrentPosition({
  timeoutMs = 15000,
  targetAccuracyMeters = 30,
  onSample
}: PreciseLocationOptions = {}) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is unavailable."));
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
    const finish = (position?: GeolocationPosition, error?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (position) resolve(position);
      else reject(error || new Error("GPS timed out."));
    };
    const timeoutId = window.setTimeout(() => {
      if (bestPosition) finish(bestPosition);
      else finish(undefined, new Error("GPS timed out."));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        if (!Number.isFinite(accuracy) || accuracy <= 0) return;
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          onSample?.(position);
        }
        if (accuracy <= targetAccuracyMeters) finish(position);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          finish(undefined, error);
          return;
        }
        if (bestPosition) finish(bestPosition);
        else finish(undefined, error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs
      }
    );
  });
}
