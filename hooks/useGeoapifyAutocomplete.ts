"use client";

import { useEffect, useState } from "react";
import { searchJamaicaLocations } from "@/lib/maps/geoapify";
import { GeoapifySuggestion } from "@/lib/maps/types";

export function useGeoapifyAutocomplete(query: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        setSuggestions(await searchJamaicaLocations(trimmed, controller.signal));
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(requestError instanceof Error ? requestError.message : "Could not search locations.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  return { suggestions, loading, error };
}
