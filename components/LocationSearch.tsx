"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { jamaicaPlaces } from "@/lib/mockData";
import { Place } from "@/types/linride";

type LocationSearchProps = {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
};

export function LocationSearch({ label, value, onChange }: LocationSearchProps) {
  const [focused, setFocused] = useState(false);
  const listId = `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-places`;
  const options = Array.from(
    new Map((jamaicaPlaces.some((place) => place.name === value.name) ? jamaicaPlaces : [value, ...jamaicaPlaces]).map((place) => [place.name, place])).values()
  );
  const searchTerm = value.name.trim().toLowerCase();
  const filteredOptions = searchTerm
    ? options.filter((place) =>
        [place.name, place.hint, place.zone, place.placeType].some((part) => part?.toLowerCase().includes(searchTerm))
      )
    : options;

  function updateLocation(name: string) {
    const trimmedName = name.trim();
    const knownPlace = jamaicaPlaces.find((place) => place.name.toLowerCase() === trimmedName.toLowerCase());

    onChange(
      knownPlace ?? {
        ...value,
        name,
        hint: trimmedName ? "Typed location" : value.hint
      }
    );
  }

  return (
    <div className="relative block">
      <span className="linride-label">{label}</span>
      <span className="flex items-center gap-3 rounded-xl border border-black/10 bg-smoke px-4 py-3">
        <MapPin size={19} className="shrink-0 text-linred" />
        <input
          value={value.name}
          onChange={(event) => updateLocation(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          list={listId}
          placeholder={label}
          autoComplete="off"
          aria-label={label}
          className="w-full bg-transparent text-sm font-bold text-charcoal outline-none"
        />
        <datalist id={listId}>
          {options.map((place) => (
            <option key={place.name} value={place.name} />
          ))}
        </datalist>
      </span>
      {focused && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 z-[60] mt-2 max-h-72 overflow-auto rounded-2xl border border-black/10 bg-white p-2 shadow-lift">
          {filteredOptions.map((place) => (
            <button
              key={place.name}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(place);
                setFocused(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-linred/12"
            >
              <span>
                <span className="block text-sm font-black text-charcoal">{place.name}</span>
                <span className="block text-xs font-bold text-charcoal/50">{place.hint || place.zone || "Jamaica"}</span>
              </span>
              <span className="shrink-0 rounded-full bg-smoke px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-charcoal/52">
                {place.placeType || "place"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
