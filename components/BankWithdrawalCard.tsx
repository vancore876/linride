import { useMemo, useState } from "react";
import { Landmark, LockKeyhole } from "lucide-react";
import { WithdrawalRequest } from "@/types/linride";

type BankWithdrawalCardProps = {
  title: string;
  balance: number;
  unitLabel: string;
  minimumAmount: number;
  conversionHelp?: string;
  requests: WithdrawalRequest[];
  onSubmit?: (request: WithdrawalFormValues) => Promise<void> | void;
};

export type WithdrawalFormValues = {
  amount: number;
  accountHolderName: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  accountType: "Savings" | "Chequing";
};

export function BankWithdrawalCard({
  title,
  balance,
  unitLabel,
  minimumAmount,
  conversionHelp,
  requests,
  onSubmit
}: BankWithdrawalCardProps) {
  const [amount, setAmount] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
  const canRequest = useMemo(() => {
    return Boolean(
      numericAmount >= minimumAmount &&
      numericAmount <= balance &&
      accountHolderName.trim() &&
      bankName.trim() &&
      accountNumber.trim() &&
      accountType.trim()
    );
  }, [accountHolderName, accountNumber, accountType, balance, bankName, minimumAmount, numericAmount]);

  async function submit() {
    if (!canRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit?.({
        amount: numericAmount,
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: accountType as "Savings" | "Chequing"
      });
      setSubmitted(true);
      setConfirming(false);
      setAmount("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Withdrawal request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-2xl bg-ink p-3 text-white">
          <Landmark size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Bank withdrawal only</p>
          <h3 className="text-xl font-black">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">
            Minimum: {minimumAmount.toLocaleString()} {unitLabel}. Admin approval is required before payout.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-smoke px-3 py-3">
        <p className="text-sm font-bold text-charcoal/55">Eligible balance</p>
        <p className="text-2xl font-black">
          {balance.toLocaleString()} {unitLabel}
        </p>
        {conversionHelp && <p className="mt-1 text-xs font-bold text-charcoal/50">{conversionHelp}</p>}
      </div>

      <div className="mt-4 grid gap-2">
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder={`Withdrawal amount in ${unitLabel}`}
        />
        <input
          value={accountHolderName}
          onChange={(event) => setAccountHolderName(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Bank account name"
        />
        <input
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Bank name"
        />
        <input
          value={branchName}
          onChange={(event) => setBranchName(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Branch, if needed"
        />
        <input
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Account number"
        />
        <select
          value={accountType}
          onChange={(event) => setAccountType(event.target.value)}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold"
        >
          <option>Savings</option>
          <option>Chequing</option>
        </select>
      </div>

      <p className="mt-3 flex gap-2 rounded-2xl bg-smoke px-3 py-2 text-xs font-bold leading-5 text-charcoal/60">
        <LockKeyhole size={16} className="shrink-0 text-linred" />
        Bank details are for the account owner and admin only. No PayPal, crypto, card payout, mobile wallet, or cash withdrawal is supported.
      </p>

      {submitted && (
        <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">
          Withdrawal request saved for admin review.
        </p>
      )}
      {error && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">{error}</p>}

      {!confirming && (
        <button
          type="button"
          disabled={!canRequest}
          onClick={() => setConfirming(true)}
          className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black text-ink disabled:bg-charcoal/25 disabled:text-charcoal/50 enabled:bg-linred"
        >
          Request bank withdrawal
        </button>
      )}

      {confirming && (
        <div className="mt-4 rounded-2xl border border-linred/25 bg-linred/10 p-3">
          <p className="text-sm font-black text-charcoal">Confirm withdrawal request?</p>
          <p className="mt-1 text-xs font-bold leading-5 text-charcoal/65">
            This sends the bank payout request to admin for manual approval and payment.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={submitting} onClick={() => void submit()} className="rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink disabled:opacity-40">
              {submitting ? "Submitting..." : "Confirm"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-2xl bg-white px-3 py-3 text-xs font-black">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-black">Withdrawal history</h4>
        <div className="mt-2 space-y-2">
          {requests.length === 0 && (
            <p className="rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/60">No withdrawal requests yet.</p>
          )}
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl bg-smoke px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">
                    {request.amount.toLocaleString()} {unitLabel}
                  </p>
                  <p className="text-xs font-bold text-charcoal/50">
                    {new Date(request.createdAt).toLocaleDateString()} - {request.status}
                  </p>
                  {request.adminNote && <p className="mt-1 text-xs font-bold text-charcoal/55">{request.adminNote}</p>}
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-charcoal/60">{request.status}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
