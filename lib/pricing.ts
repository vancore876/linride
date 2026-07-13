import { BoostTag, FareZone, Place } from "@/types/linride";
import { fareZones } from "@/lib/mockData";

export const boostAmounts: Record<BoostTag, number> = {
  Rain: 200,
  "Bad road": 300,
  "Heavy package": 200,
  "Extra stop": 150,
  "Waiting time": 100,
  "Late night": 300,
  "Long distance": 500,
  "Return trip": 0
};

export function getFareZone(destination: Place): FareZone {
  return fareZones.find((zone) => zone.zoneName === destination.zone) ?? fareZones[fareZones.length - 1];
}

export function calculateBoostTotal(tags: BoostTag[], baseMax: number) {
  const flatBoost = tags.reduce((total, tag) => total + boostAmounts[tag], 0);
  const returnTripBoost = tags.includes("Return trip") ? Math.round(baseMax * 0.5) : 0;
  return flatBoost + returnTripBoost;
}

export function getSuggestedFare(destination: Place, tags: BoostTag[]) {
  const zone = getFareZone(destination);
  const boostTotal = calculateBoostTotal(tags, zone.maxFareJmd);
  return {
    zone,
    boostTotal,
    min: zone.minFareJmd + boostTotal,
    max: zone.maxFareJmd + boostTotal
  };
}
