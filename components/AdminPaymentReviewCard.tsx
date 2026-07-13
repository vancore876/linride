import { CheckCircle2, XCircle } from "lucide-react";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import { Driver } from "@/types/linride";

type AdminPaymentReviewCardProps = {
  driver: Driver;
  onApprove: () => void;
};

export function AdminPaymentReviewCard({ driver, onApprove }: AdminPaymentReviewCardProps) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Pending subscription</p>
          <h3 className="text-lg font-black">{driver.profile.fullName}</h3>
          <p className="text-sm font-semibold text-charcoal/58">
            ${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} JMD - Bank transfer - Ref LIN-2000
          </p>
        </div>
        <span className="rounded-full bg-smoke px-3 py-1 text-xs font-black">{driver.subscriptionStatus}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="flex items-center justify-center gap-2 rounded-2xl bg-linred px-3 py-3 text-sm font-black text-ink"
        >
          <CheckCircle2 size={18} />
          Approve
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-3 text-sm font-black text-white"
        >
          <XCircle size={18} />
          Reject
        </button>
      </div>
    </article>
  );
}
