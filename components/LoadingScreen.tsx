"use client";

import { useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { CountryRoadScene } from "@/components/auth/CountryRoadScene";

type LoadingScreenProps = {
  onComplete?: () => void;
  onContinue?: () => void;
};

/** Show the introduction briefly, never invent progress or block a slow sign-in. */
export function LoadingScreen({ onComplete, onContinue }: LoadingScreenProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const slowTimer = window.setTimeout(() => setSlow(true), 4500);
    const introductionTimer = onComplete ? window.setTimeout(onComplete, 1350) : undefined;
    return () => {
      window.clearTimeout(slowTimer);
      if (introductionTimer !== undefined) window.clearTimeout(introductionTimer);
    };
  }, [onComplete]);

  return (
    <main className="auth4-splash" role="status" aria-live="polite" aria-label="Opening LinRide">
      <div className="auth4-splash-top">
        <div className="auth4-splash-brand"><span className="auth4-splash-pin"><MapPin size={25} strokeWidth={2.5} /></span><strong>lin<span>ride</span>.</strong></div>
        <span className="auth4-splash-location">JAMAICA • LOCAL RIDES & DELIVERY</span>
      </div>
      <section className="auth4-splash-message">
        <span className="auth4-splash-eyebrow">WELCOME TO LINRIDE</span>
        <h1>A better way<br />to get there.</h1>
        <p>Made for the roads we know and the places we call home.</p>
        <div className="auth4-splash-status">
          <span className="auth4-loading-track" aria-hidden="true"><span /></span>
          <span>{slow ? "Connection is taking longer than expected…" : "Opening your journey…"}</span>
        </div>
        {slow && (onContinue || onComplete) && (
          <button className="auth4-splash-skip" type="button" onClick={onContinue ?? onComplete}>
            Continue to sign in <ArrowRight size={16} />
          </button>
        )}
      </section>
      <CountryRoadScene className="auth4-splash-landscape" />
      <span className="auth4-splash-bottom-label">LINSTEAD · ST. CATHERINE · JAMAICA</span>
    </main>
  );
}
