import { WalletCards } from "lucide-react";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import { DriverEarningsSummary } from "@/types/linride";

type EarningsSummaryCardProps = {
  summary?: DriverEarningsSummary | null;
  passExpiresAt?: string;
};

export function EarningsSummaryCard({ summary, passExpiresAt }: EarningsSummaryCardProps) {
  const weekEarnedJmd = summary?.weekEstimatedJmd ?? 0;
  const estimatedNetJmd = Math.max(0, weekEarnedJmd - DRIVER_WEEKLY_PASS_JMD);

  return (
    <section className="rounded-3xl bg-ink p-4 text-white shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Driver earnings</p>
          <h3 className="text-2xl font-black">Keep your fare.</h3>
        </div>
        <WalletCards size={25} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Today earned", `$${(summary?.todayEstimatedJmd ?? 0).toLocaleString()}`],
          ["Today's rides", String(summary?.todayTrips ?? 0)],
          ["Week earned", `$${weekEarnedJmd.toLocaleString()}`],
          ["Weekly pass", `$${DRIVER_WEEKLY_PASS_JMD.toLocaleString()}`],
          ["Estimated net", `$${estimatedNetJmd.toLocaleString()}`],
          ["Completed trips", String(summary?.weekTrips ?? 0)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/10 px-3 py-3">
            <p className="text-lg font-black">{value}</p>
            <p className="text-xs font-semibold text-white/55">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-white/55">
        Active pass expiry: {passExpiresAt ? new Date(passExpiresAt).toLocaleDateString() : "No active pass"}
      </p>
      {summary && summary.completedTrips.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs font-black uppercase text-white/55">Recent completed jobs</p>
          {summary.completedTrips.slice(0, 4).map((earning) => (
            <div key={earning.id} className="mt-2 flex items-center justify-between text-xs font-bold">
              <span>{earning.earningType} - {new Date(earning.earnedAt).toLocaleDateString()}</span>
              <span>J${earning.amountJmd.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
