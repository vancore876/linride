import { BoostTag, Place } from "@/types/linride";
import { boostAmounts, getSuggestedFare } from "@/lib/pricing";

const boostTags: BoostTag[] = ["Rain", "Bad road", "Heavy package", "Extra stop", "Waiting time", "Late night", "Long distance", "Return trip"];

type BoostTagSelectorProps = {
  value: BoostTag[];
  destination: Place;
  onChange: (tags: BoostTag[]) => void;
};

export function BoostTagSelector({ value, destination, onChange }: BoostTagSelectorProps) {
  const pricing = getSuggestedFare(destination, value);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black">Rain / bad road boosts</h3>
        <span className="text-xs font-black text-linred">+${pricing.boostTotal.toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {boostTags.map((tag) => {
          const active = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(active ? value.filter((item) => item !== tag) : [...value, tag])}
              className={`rounded-2xl px-3 py-3 text-left text-xs font-black ${
                active ? "bg-linred text-ink" : "bg-smoke text-charcoal"
              }`}
            >
              {tag}
              <span className="block pt-1 text-[11px] opacity-70">
                {tag === "Return trip" ? "+50%" : `+$${boostAmounts[tag].toLocaleString()}`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
