"use client";

import { ShieldCheck, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";

type WeeklyPassAgreementProps = {
  onAgree: () => void;
  onClose: () => void;
};

export function WeeklyPassAgreement({ onAgree, onClose }: WeeklyPassAgreementProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="weekly-pass-backdrop" role="dialog" aria-modal="true" aria-labelledby="weekly-pass-title">
      <section className="weekly-pass-dialog">
        <button type="button" onClick={onClose} className="weekly-pass-close" aria-label="Close agreement"><X size={20} /></button>
        <span className="weekly-pass-icon"><WalletCards size={27} /></span>
        <p className="linride-eyebrow">Driver weekly pass agreement</p>
        <h2 id="weekly-pass-title">J${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} every 7 days</h2>
        <p>Your driver account can go online only after the payment is submitted and approved by Lin Ride admin.</p>
        <div className="weekly-pass-terms">
          <span><ShieldCheck size={17} /> You keep 100% of accepted ride fares.</span>
          <span><ShieldCheck size={17} /> The pass lasts 7 days from approval.</span>
          <span><ShieldCheck size={17} /> An expired or rejected payment takes the account offline.</span>
          <span><ShieldCheck size={17} /> Approved documents and a profile picture are also required.</span>
        </div>
        <label className="weekly-pass-check">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>I understand and agree to the J${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} weekly driver pass.</span>
        </label>
        <button type="button" disabled={!accepted} onClick={onAgree} className="linride-submit">Agree and continue to payment</button>
      </section>
    </div>
  );
}
