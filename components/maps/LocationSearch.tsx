"use client";

import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useGeoapifyAutocomplete } from "@/hooks/useGeoapifyAutocomplete";
import { jamaicaPlaces } from "@/lib/mockData";
import { GeoapifySuggestion } from "@/lib/maps/types";
import { Place } from "@/types/linride";

type LocationSearchProps = {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
};

export function LocationSearch({ label, value, onChange }: LocationSearchProps) {
  const [query, setQuery] = useState(value.name);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const { suggestions, loading, error } = useGeoapifyAutocomplete(query, open);

  useEffect(() => setQuery(value.name), [value.name]);

  const localSuggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jamaicaPlaces.slice(0, 8);
    return jamaicaPlaces
      .filter((place) => [place.name, place.zone, place.hint].some((part) => part?.toLowerCase().includes(term)))
      .slice(0, 5);
  }, [query]);

  const combined = useMemo(() => {
    const remotePlaces: Place[] = suggestions.map((item) => ({
      name: item.formatted,
      lat: item.latitude,
      lng: item.longitude,
      placeId: item.placeId,
      hint: item.category || "Jamaica location"
    }));
    return Array.from(new Map([...remotePlaces, ...localSuggestions].map((place) => [place.name, place])).values()).slice(0, 8);
  }, [localSuggestions, suggestions]);

  function select(place: Place) {
    onChange(place);
    setQuery(place.name);
    setOpen(false);
    setActiveIndex(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && event.key === "ArrowDown") {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, combined.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && combined[activeIndex]) {
      event.preventDefault();
      select(combined[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <label className="map-search-field">
      <span className="linride-label">{label}</span>
      <span className="map-search-input-wrap">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => {
            const name = event.target.value;
            setQuery(name);
            setOpen(true);
            setActiveIndex(0);
            onChange({ ...value, name, lat: 0, lng: 0, placeId: undefined, hint: "Choose a suggestion or drop a pin" });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search anywhere in Jamaica"
          autoComplete="off"
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
        />
        {loading && <LoaderCircle className="animate-spin" size={17} />}
      </span>
      {open && (
        <span id={listId} role="listbox" className="map-search-menu">
          {combined.map((place, index) => (
            <button
              key={`${place.name}-${place.lat}-${place.lng}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "map-search-option-active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(place)}
            >
              <MapPin size={17} />
              <span><strong>{place.name}</strong><small>{place.hint || place.zone || "Jamaica"}</small></span>
            </button>
          ))}
          {!loading && combined.length === 0 && <span className="map-search-state">No Jamaican locations found.</span>}
          {error && combined.length === 0 && <span className="map-search-state map-search-error">{error}</span>}
        </span>
      )}
    </label>
  );
}
