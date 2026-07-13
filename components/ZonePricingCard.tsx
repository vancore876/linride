import { TrendingUp } from "lucide-react";
import { BoostTag, Place } from "@/types/linride";
import { getSuggestedFare } from "@/lib/pricing";

type ZonePricingCardProps = {
  destination: Place;
  boostTags: BoostTag[];
};

export function ZonePricingCard({ destination, boostTags }: ZonePricingCardProps) {
  const pricing = getSuggestedFare(destination, boostTags);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Linstead zone pricing</p>
          <h3 className="mt-1 text-xl font-black">{pricing.zone.zoneName}</h3>
        </div>
        <TrendingUp size={22} className="text-charcoal" />
      </div>
      <p className="mt-3 text-2xl font-black">
        ${pricing.min.toLocaleString()}-${pricing.max.toLocaleString()} JMD
      </p>
      <p className="mt-1 text-sm font-semibold text-charcoal/58">Local offer range. {pricing.zone.notes}</p>
      <p className="mt-3 rounded-2xl bg-smoke px-3 py-2 text-sm font-bold text-charcoal/70">
        Drivers may accept, counter, or ignore your offer.
      </p>
    </section>
  );
}
