import { Upload, WalletCards } from "lucide-react";
import { useState } from "react";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import { DriverSubscriptionStatus } from "@/types/linride";

type SubscriptionCardProps = {
  status: DriverSubscriptionStatus;
  onSubmitProof: (proof: { method: string; referenceNumber: string; note: string; file?: File | null }) => void;
};

export function SubscriptionCard({ status, onSubmitProof }: SubscriptionCardProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const weeklyPassLabel = `J$${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} / week`;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-lift">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Weekly Driver Pass</p>
          <h2 className="text-3xl font-black">{weeklyPassLabel}</h2>
          <p className="mt-2 text-sm font-semibold text-charcoal/62">
            Your weekly Lin Ride driver pass has expired. Pay {weeklyPassLabel} to continue receiving rides.
          </p>
        </div>
        <WalletCards size={28} className="text-charcoal" />
      </div>
      <div className="grid gap-2 text-sm font-bold text-charcoal/78">
        {["Receive rider requests", "Accept unlimited rides for the week", "Counter rider offers", "Appear online on Lin Ride map"].map(
          (benefit) => (
            <div key={benefit} className="rounded-2xl bg-smoke px-3 py-2">
              {benefit}
            </div>
          )
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-black/10 bg-smoke p-3">
        <p className="mb-2 text-sm font-black">MVP payment options</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-charcoal/65">
          <span>Bank transfer</span>
          <span>Lynk</span>
          <span>Cash to admin</span>
          <span>Manual proof</span>
        </div>
      </div>
      {status === "pending" && (
        <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">
          Payment proof is pending approval. You cannot receive rides until admin approves it.
        </p>
      )}
      <div className="mt-4 space-y-2">
        <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" placeholder="Reference number" />
        <select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">
          <option>Bank transfer</option>
          <option>Lynk</option>
          <option>Cash payment to admin</option>
        </select>
        <input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" />
        <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" placeholder="Note to admin" />
        <button
          type="button"
          onClick={() => onSubmitProof({ method, referenceNumber, note, file })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white"
        >
          <Upload size={18} />
          Submit payment proof
        </button>
      </div>
    </section>
  );
}
