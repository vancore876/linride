import { KeyRound } from "lucide-react";
import { useState } from "react";

type TripPinCardProps = {
  pin?: string | null;
  verified?: boolean;
  message?: string | null;
  onVerify?: (pin: string) => void;
  mode?: "display" | "verify";
};

export function TripPinCard({ pin = "4826", verified = false, message, onVerify, mode = "display" }: TripPinCardProps) {
  const [enteredPin, setEnteredPin] = useState("");

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Community Safety Check</p>
          <h3 className="text-xl font-black">
            {mode === "display" ? `Trip PIN: ${pin || "----"}` : "Verify trip PIN"}
          </h3>
        </div>
        <KeyRound size={23} />
      </div>
      <p className="mt-3 text-sm font-semibold text-charcoal/60">
        {mode === "display"
          ? "Tell this 4-digit PIN to your assigned driver only after the vehicle and plate match."
          : "Ask the passenger for the 4-digit PIN before starting the trip."}
      </p>
      {mode === "verify" && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            value={enteredPin}
            onChange={(event) => setEnteredPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            className="w-full rounded-2xl border border-black/10 px-4 py-3 text-center text-lg font-black"
            placeholder="4-digit PIN"
            inputMode="numeric"
            maxLength={4}
          />
          <button
            type="button"
            disabled={enteredPin.length !== 4 || verified}
            onClick={() => onVerify?.(enteredPin)}
            className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            {verified ? "Verified" : "Verify"}
          </button>
        </div>
      )}
      {(message || verified) && (
        <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-linred">
          {verified ? "PIN verified. The driver can now start the trip." : message}
        </p>
      )}
    </section>
  );
}
