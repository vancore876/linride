import { MapPin } from "lucide-react";
import { popularPlaces } from "@/lib/mockData";
import { Place } from "@/types/linride";

type LocalPlaceChipsProps = {
  onSelect: (place: Place) => void;
};

export function LocalPlaceChips({ onSelect }: LocalPlaceChipsProps) {
  return (
    <section className="linride-card min-w-0 max-w-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black">Local pickup points</h3>
        <span className="linride-status-badge linride-status-pending">Linstead</span>
      </div>
      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        {popularPlaces.map((place) => (
          <button
            key={place.name}
            type="button"
            onClick={() => onSelect(place)}
            className="linride-list-item w-full min-w-0 max-w-full text-left"
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
