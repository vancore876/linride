import { NextRequest, NextResponse } from "next/server";
import { RouteDetails } from "@/types/linride";

export const dynamic = "force-dynamic";

type Coordinates = { latitude: number; longitude: number };
type RouteRequest = { origin?: Coordinates; destination?: Coordinates };
type RateRecord = { count: number; resetAt: number };

const routeCache = new Map<string, { value: RouteDetails; expiresAt: number }>();
const rateLimits = new Map<string, RateRecord>();

function validCoordinates(value?: Coordinates) {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      value.latitude >= -90 &&
      value.latitude <= 90 &&
      value.longitude >= -180 &&
      value.longitude <= 180
  );
}

function rateLimit(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.ip || "local";
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 30;
}

export async function POST(request: NextRequest) {
  if (rateLimit(request)) return NextResponse.json({ error: "Too many route requests. Try again in a minute." }, { status: 429 });

  try {
    const body = (await request.json()) as RouteRequest;
    if (!validCoordinates(body.origin) || !validCoordinates(body.destination)) {
      return NextResponse.json({ error: "Valid pickup and destination coordinates are required." }, { status: 400 });
    }
    if (body.origin?.latitude === body.destination?.latitude && body.origin?.longitude === body.destination?.longitude) {
      return NextResponse.json({ error: "Pickup and destination must be different." }, { status: 400 });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Geoapify is not configured yet." }, { status: 503 });

    const cacheKey = [body.origin?.latitude, body.origin?.longitude, body.destination?.latitude, body.destination?.longitude]
      .map((value) => Number(value).toFixed(5))
      .join(":");
    const cached = routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.value);

    const query = new URLSearchParams({
      waypoints: `${body.origin?.latitude},${body.origin?.longitude}|${body.destination?.latitude},${body.destination?.longitude}`,
      mode: "drive",
      format: "geojson",
      apiKey
    });
    const geoapifyResponse = await fetch(`https://api.geoapify.com/v1/routing?${query}`, { cache: "no-store" });
    if (geoapifyResponse.status === 429) {
      return NextResponse.json({ error: "Map route limit reached. Try again shortly." }, { status: 429 });
    }
    if (!geoapifyResponse.ok) {
      return NextResponse.json({ error: "Road routing is temporarily unavailable." }, { status: 502 });
    }

    const data = (await geoapifyResponse.json()) as {
      features?: Array<{
        properties?: { distance?: number; time?: number };
        geometry?: GeoJSON.LineString | GeoJSON.MultiLineString;
      }>;
    };
    const feature = data.features?.[0];
    if (!feature?.geometry || !Number.isFinite(feature.properties?.distance) || !Number.isFinite(feature.properties?.time)) {
      return NextResponse.json({ error: "No drivable route was found." }, { status: 404 });
    }

    const result: RouteDetails = {
      distanceMeters: Math.round(feature.properties?.distance as number),
      durationSeconds: Math.round(feature.properties?.time as number),
      routeGeometry: feature.geometry
    };
    routeCache.set(cacheKey, { value: result, expiresAt: Date.now() + 5 * 60_000 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not calculate this route." }, { status: 500 });
  }
}
