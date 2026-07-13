import { GeoapifySuggestion } from "@/lib/maps/types";
import { Place } from "@/types/linride";

const JAMAICA_CENTER = { latitude: 18.1366, longitude: -77.031 };

export function getGeoapifyKey() {
  return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";
}

export function getGeoapifyStyleUrl() {
  const key = getGeoapifyKey();
  return key ? `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${encodeURIComponent(key)}` : "";
}

export async function searchJamaicaLocations(
  text: string,
  signal: AbortSignal,
  bias = JAMAICA_CENTER
): Promise<GeoapifySuggestion[]> {
  const key = getGeoapifyKey();
  if (!key) throw new Error("Geoapify is not configured yet.");

  const commonParams = {
    filter: "countrycode:jm",
    bias: `proximity:${bias.longitude},${bias.latitude}`,
    format: "json",
    limit: "8",
    apiKey: key
  };
  const autocompleteQuery = new URLSearchParams({
    text,
    ...commonParams
  });
  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${autocompleteQuery}`, { signal });
  if (response.status === 429) throw new Error("Location search limit reached. Try again shortly.");
  if (!response.ok) throw new Error("Location search is temporarily unavailable.");

  type GeoapifyResult = {
    formatted?: string;
    lat?: number;
    lon?: number;
    place_id?: string;
    category?: string;
    result_type?: string;
  };
  const data = (await response.json()) as {
    results?: GeoapifyResult[];
  };
  let results = data.results || [];

  if (results.length < 5) {
    const searchQuery = new URLSearchParams({
      text: `${text}, Jamaica`,
      ...commonParams
    });
    const searchResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?${searchQuery}`, { signal });
    if (searchResponse.ok) {
      const searchData = (await searchResponse.json()) as { results?: GeoapifyResult[] };
      results = [...results, ...(searchData.results || [])];
    }
  }

  return Array.from(
    new Map(
      results
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon) && item.formatted)
        .map((item) => [item.place_id || `${item.formatted}-${item.lat}-${item.lon}`, item])
    ).values()
  )
    .slice(0, 8)
    .map((item) => ({
      formatted: item.formatted as string,
      latitude: item.lat as number,
      longitude: item.lon as number,
      placeId: item.place_id,
      category: item.category || item.result_type
    }));
}

export async function reverseGeocodeJamaica(latitude: number, longitude: number, signal?: AbortSignal): Promise<Place> {
  const key = getGeoapifyKey();
  if (!key) return { name: "Dropped pin", lat: latitude, lng: longitude, hint: "Manual map pin" };

  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "json",
    apiKey: key
  });
  const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${query}`, { signal });
  if (!response.ok) return { name: "Dropped pin", lat: latitude, lng: longitude, hint: "Manual map pin" };
  const data = (await response.json()) as { results?: Array<{ formatted?: string; place_id?: string }> };
  const result = data.results?.[0];
  return {
    name: result?.formatted || "Dropped pin",
    lat: latitude,
    lng: longitude,
    placeId: result?.place_id,
    hint: "Confirmed map pin"
  };
}
