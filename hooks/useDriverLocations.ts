"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LiveDriverLocation } from "@/types/linride";

const LIVE_LOCATION_MAX_AGE_MS = 60_000;

type DriverLocationRow = {
  id: string;
  driver_id: string;
  lat: number | string | null;
  lng: number | string | null;
  heading: number | string | null;
  speed: number | string | null;
  accuracy: number | string | null;
  is_online: boolean;
  is_available: boolean;
  updated_at: string;
};

function mapLocation(row: DriverLocationRow, assignedDriverId?: string): LiveDriverLocation | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lng);
  if (!row.is_online || (!row.is_available && row.driver_id !== assignedDriverId) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (Date.now() - new Date(row.updated_at).getTime() > LIVE_LOCATION_MAX_AGE_MS) return null;

  return {
    id: row.id,
    driverId: row.driver_id,
    latitude,
    longitude,
    heading: row.heading == null ? null : Number(row.heading),
    speed: row.speed == null ? null : Number(row.speed),
    accuracy: row.accuracy == null ? null : Number(row.accuracy),
    isOnline: row.is_online,
    isAvailable: row.is_available,
    updatedAt: row.updated_at
  };
}

export function useDriverLocations(assignedDriverId?: string) {
  const [locations, setLocations] = useState<LiveDriverLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const load = async () => {
      const cutoff = new Date(Date.now() - LIVE_LOCATION_MAX_AGE_MS).toISOString();
      const { data, error: queryError } = await client
        .from("driver_locations")
        .select("id,driver_id,lat,lng,heading,speed,accuracy,is_online,is_available,updated_at")
        .eq("is_online", true)
        .gte("updated_at", cutoff);
      if (!active) return;
      if (queryError) {
        setError("Live drivers could not be loaded.");
        return;
      }
      setLocations((data || []).map((row) => mapLocation(row as DriverLocationRow, assignedDriverId)).filter((item): item is LiveDriverLocation => Boolean(item)));
      setError(null);
    };

    const channel = client
      .channel("live-driver-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, (payload) => {
        const row = payload.new as DriverLocationRow | undefined;
        if (!row?.driver_id) {
          void load();
          return;
        }
        const mapped = mapLocation(row, assignedDriverId);
        setLocations((current) => {
          const remaining = current.filter((item) => item.driverId !== row.driver_id);
          return mapped ? [...remaining, mapped] : remaining;
        });
        setError(null);
      })
      .subscribe();
    void load();
    const staleTimer = window.setInterval(() => void load(), 30_000);

    return () => {
      active = false;
      window.clearInterval(staleTimer);
      void client.removeChannel(channel);
    };
  }, [assignedDriverId]);

  return { locations, error };
}
