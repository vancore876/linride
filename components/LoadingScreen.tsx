"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MapPin, ShieldCheck } from "lucide-react";

type LoadingScreenProps = {
  onContinue: () => void;
};

/**
 * A real session-restoration state, not a fixed-duration splash.
 * The parent decides when restoration is finished, and can cancel a stalled attempt.
 */
export function LoadingScreen({ onContinue }: LoadingScreenProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="lr3-boot" role="status" aria-live="polite" aria-label="Opening LinRide">
      <div className="lr3-boot-orb lr3-boot-orb-one" aria-hidden="true" />
      <div className="lr3-boot-orb lr3-boot-orb-two" aria-hidden="true" />
      <div className="lr3-boot-content">
        <div className="lr3-boot-brand">
          <span className="lr3-boot-brand-icon"><MapPin size={27} strokeWidth={2.5} /></span>
          <span>lin<span>ride.</span></span>
        </div>
        <h1>Every journey starts somewhere.</h1>
        <p>We're checking your saved sign-in so you can get straight to your ride.</p>
        <div className="lr3-boot-progress" aria-hidden="true"><span /></div>
        <div className="lr3-boot-status"><LoaderCircle size={16} className="lr3-boot-spin" /> {slow ? "Connection is taking a little longer…" : "Opening your workspace…"}</div>
        {slow && (
          <button type="button" className="lr3-boot-continue" onClick={onContinue}>
            Continue to sign in <ArrowRight size={17} />
          </button>
        )}
        <span className="lr3-boot-footer"><ShieldCheck size={15} /> Made for Jamaica. Built for your journey.</span>
      </div>
    </main>
  );
}
