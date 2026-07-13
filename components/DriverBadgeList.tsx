import { BadgeCheck } from "lucide-react";
import { DriverBadge } from "@/types/linride";

type DriverBadgeListProps = {
  badges: DriverBadge[];
};

export function DriverBadgeList({ badges }: DriverBadgeListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-smoke px-3 py-1 text-xs font-black text-charcoal/72">
          <BadgeCheck size={13} className="text-linred" />
          {badge}
        </span>
      ))}
    </div>
  );
}
