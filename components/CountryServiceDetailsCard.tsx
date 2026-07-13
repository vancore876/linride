import { CalendarClock, MapPinHouse } from "lucide-react";
import { BoostTag, RideRequestDraft } from "@/types/linride";

type CountryServiceDetailsCardProps = {
  draft: RideRequestDraft;
  onChange: (draft: RideRequestDraft) => void;
};

const optionLabels: Array<{ key: keyof RideRequestDraft; label: string; boost?: BoostTag }> = [
  { key: "badRoadNote", label: "Bad / rough road", boost: "Bad road" },
  { key: "heavyItem", label: "Heavy item", boost: "Heavy package" },
  { key: "fragileItem", label: "Fragile item" },
  { key: "callWhenNearby", label: "Call when nearby" },
  { key: "extraStop", label: "Extra stop", boost: "Extra stop" },
  { key: "returnTrip", label: "Return trip", boost: "Return trip" }
];

export function CountryServiceDetailsCard({ draft, onChange }: CountryServiceDetailsCardProps) {
  function update(field: keyof RideRequestDraft, value: string | boolean) {
    onChange({ ...draft, [field]: value });
  }

  function toggleOption(field: keyof RideRequestDraft, selected: boolean, boost?: BoostTag) {
    const boostTags = boost
      ? selected
        ? Array.from(new Set([...draft.boostTags, boost]))
        : draft.boostTags.filter((item) => item !== boost)
      : draft.boostTags;
    onChange({ ...draft, [field]: selected, boostTags });
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-2xl bg-linred/10 p-3 text-linred">
          <MapPinHouse size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Country directions</p>
          <h3 className="text-xl font-black">Landmarks and notes</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">
            Add the kind of directions drivers actually need when the map pin is only close.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <input
          value={draft.pickupLandmark || ""}
          onChange={(event) => update("pickupLandmark", event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Pickup landmark, example: blue gate beside shop"
        />
        <input
          value={draft.dropoffLandmark || ""}
          onChange={(event) => update("dropoffLandmark", event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Drop-off landmark or district direction"
        />
        <textarea
          value={draft.customerNotes || ""}
          onChange={(event) => update("customerNotes", event.target.value)}
          className="min-h-20 rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Notes, example: blue gate, rough road after bridge"
        />
        <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">
          <CalendarClock size={18} className="text-linred" />
          <span className="shrink-0 text-charcoal/60">Schedule</span>
          <input
            value={draft.scheduledTime || ""}
            onChange={(event) => update("scheduledTime", event.target.value)}
            className="w-full bg-transparent text-sm font-bold outline-none"
            type="datetime-local"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {optionLabels.map((option) => {
          const selected = Boolean(draft[option.key]);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleOption(option.key, !selected, option.boost)}
              className={`rounded-2xl px-3 py-3 text-xs font-black ${
                selected ? "bg-ink text-white" : "bg-smoke text-charcoal"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
