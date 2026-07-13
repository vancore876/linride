import { MapPin } from "lucide-react";
import { popularPlaces } from "@/lib/mockData";
import { Place } from "@/types/linride";

type LocalPlaceChipsProps = {
  onSelect: (place: Place) => void;
};

export function LocalPlaceChips({ onSelect }: LocalPlaceChipsProps) {
  return (
    <section className="linride-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black">Local pickup points</h3>
        <span className="linride-status-badge linride-status-pending">Linstead</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {popularPlaces.map((place) => (
          <button
            key={place.name}
            type="button"
            onClick={() => onSelect(place)}
            className="linride-list-item min-w-[142px] text-left"
          >
            <MapPin size={16} className="mb-2 text-linred" />
            <p className="text-sm font-black">{place.name}</p>
            <p className="mt-1 text-xs font-semibold text-charcoal/55">{place.hint}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
