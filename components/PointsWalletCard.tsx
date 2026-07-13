import { Gift, ShieldCheck } from "lucide-react";
import { PointsRuleSettings, PointsTransaction, PointsWallet } from "@/types/linride";

type PointsWalletCardProps = {
  wallet: PointsWallet;
  transactions: PointsTransaction[];
  rules: PointsRuleSettings;
};

export function PointsWalletCard({ wallet, transactions, rules }: PointsWalletCardProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Points wallet</p>
          <h3 className="text-2xl font-black">{wallet.availablePoints.toLocaleString()} points</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">
            Earn points after real completed rides, deliveries, errands, and business orders.
          </p>
        </div>
        <span className="rounded-2xl bg-linred/10 p-3 text-linred">
          <Gift size={22} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["Available", wallet.availablePoints],
          ["Pending", wallet.pendingPoints],
          ["Frozen", wallet.frozenPoints],
          ["Lifetime earned", wallet.lifetimeEarnedPoints]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-smoke px-3 py-3">
            <p className="text-lg font-black">{Number(value).toLocaleString()}</p>
            <p className="text-xs font-bold text-charcoal/55">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 p-3">
        <p className="flex items-center gap-2 text-sm font-black">
          <ShieldCheck size={17} className="text-linred" />
          Fraud-safe rewards
        </p>
        <p className="mt-2 text-xs font-semibold leading-5 text-charcoal/60">
          Cancelled, refunded, disputed, pending, or frozen jobs cannot be withdrawn. Admin can reverse or freeze points when a job is under review.
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-bold text-charcoal/70">
        <div className="rounded-2xl bg-smoke px-3 py-2">Ride: +{rules.completedRide} points</div>
        <div className="rounded-2xl bg-smoke px-3 py-2">Delivery: +{rules.completedDelivery} points</div>
        <div className="rounded-2xl bg-smoke px-3 py-2">Errand: +{rules.completedErrand} points</div>
        <div className="rounded-2xl bg-smoke px-3 py-2">Rating bonus: +{rules.ratingBonus} points</div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-black">Recent point activity</h4>
        <div className="mt-2 space-y-2">
          {transactions.length === 0 && (
            <p className="rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/60">No point activity yet.</p>
          )}
          {transactions.slice(0, 4).map((transaction) => (
            <article key={transaction.id} className="rounded-2xl bg-smoke px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">{transaction.reason}</p>
                  <p className="text-xs font-bold text-charcoal/50">
                    {transaction.status} - {new Date(transaction.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-black ${transaction.amount >= 0 ? "text-linred" : "text-charcoal/60"}`}>
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.amount}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
