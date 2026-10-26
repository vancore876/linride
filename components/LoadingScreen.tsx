"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type LoadingScreenProps = {
  onComplete?: () => void;
  onContinue?: () => void;
};

/** Approved route-map splash, adapted from the HTML preview without its demo controls. */
export function LoadingScreen({ onComplete, onContinue }: LoadingScreenProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    // The entrance is brief; authentication restoration still controls when the app opens.
    const introduction = onComplete ? window.setTimeout(onComplete, 2350) : undefined;
    const slowConnection = window.setTimeout(() => setSlow(true), 4500);
    return () => {
      if (introduction !== undefined) window.clearTimeout(introduction);
      window.clearTimeout(slowConnection);
    };
  }, [onComplete]);

  return (
    <main className="lrs-splash" role="status" aria-live="polite" aria-label="Opening LinRide">
      <div className="lrs-outer-ring" aria-hidden="true" />
      <div className="lrs-map" aria-hidden="true">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="lrs-bloom"><feGaussianBlur stdDeviation="8" /></filter>
          </defs>
          <path className="lrs-neighborhood" d="M15 120L290 0L468 125L415 288L208 314L50 230ZM544 30L826 11L1009 172L925 404L667 363L517 205ZM70 503L372 428L510 600L436 867L101 894ZM560 584L870 449L1004 611L976 943L690 998L529 855Z" />
          <path className="lrs-road" d="M-120 236C78 290 161 281 295 214S587 146 713 288S907 421 1102 305" />
          <path className="lrs-road" d="M-80 690C122 573 247 641 383 583S552 329 687 354S957 576 1112 503" />
          <path className="lrs-road" d="M226-100C300 66 309 175 274 322S278 649 409 779S410 962 376 1140" />
          <path className="lrs-road" d="M729-80C588 73 588 222 676 354S814 612 768 782S774 935 951 1097" />
          <path className="lrs-road-minor" d="M-20 94C148 149 361 30 503-20M70 335C226 396 312 331 478 300S694 168 822 171M76 951C170 829 313 832 563 908M465 577C565 621 650 551 778 533M423 80C512 134 537 276 538 380M817 731C918 685 961 810 1099 831" />
          <path className="lrs-road-minor" d="M109 40L96 271M151 422C223 479 318 474 370 528M535 740C562 695 576 670 701 666M950 162C894 241 875 308 913 385" />
          <path className="lrs-road-hair" d="M-120 236C78 290 161 281 295 214S587 146 713 288S907 421 1102 305M-80 690C122 573 247 641 383 583S552 329 687 354S957 576 1112 503M226-100C300 66 309 175 274 322S278 649 409 779S410 962 376 1140" />
          <text className="lrs-map-text" x="170" y="180">LOCAL ROUTES</text>
          <text className="lrs-map-text" x="735" y="790">JAMAICA</text>
          <path className="lrs-route-shadow" d="M238 714C346 656 327 536 441 478S572 366 663 354S840 378 875 304" />
          <path className="lrs-route" d="M238 714C346 656 327 536 441 478S572 366 663 354S840 378 875 304" />
          <g className="lrs-node">
            <circle className="lrs-pin-pulse" cx="238" cy="714" r="13" />
            <circle cx="238" cy="714" r="11" fill="#cbfa8a" />
            <circle cx="238" cy="714" r="4" fill="#09251b" />
          </g>
          <g className="lrs-node lrs-node-second">
            <circle cx="875" cy="304" r="13" fill="#cbfa8a" opacity=".14" />
            <circle cx="875" cy="304" r="7" fill="#cbfa8a" />
          </g>
        </svg>
      </div>
      <div className="lrs-shell">
        <header className="lrs-top">
          <div className="lrs-brand">
            <span className="lrs-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M8 7v17h16" stroke="#cbfa8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="24" r="3.2" fill="#cbfa8a" />
                <circle cx="8" cy="7" r="3.2" fill="#cbfa8a" />
              </svg>
            </span>
            <span className="lrs-word">lin<b>ride</b>.</span>
          </div>
          <span className="lrs-top-right"><span className="lrs-dot" /> BUILT FOR JAMAICA</span>
        </header>
        <section className="lrs-hero">
          <div className="lrs-eyebrow">Every road has a story</div>
          <h1>Move<br /><span>your way.</span></h1>
          <p>From your doorstep to wherever life takes you. Rides, deliveries and everyday journeys across Jamaica.</p>
        </section>
        <footer className="lrs-bottom">
          <div className="lrs-loader">
            <div className="lrs-loader-label">
              <span>OPENING LINRIDE</span>
              <span className="lrs-small">{slow ? "CHECKING CONNECTION" : "GOOD THINGS ARE MOVING"}</span>
            </div>
            <div className="lrs-bar" aria-hidden="true" />
            {slow && (onContinue || onComplete) && (
              <button className="lrs-continue" type="button" onClick={onContinue ?? onComplete}>
                Continue to sign in <ArrowRight size={15} />
              </button>
            )}
          </div>
          <div className="lrs-footer"><span>RIDES</span><span>DELIVERIES</span><span>LOCAL CONNECTIONS</span></div>
        </footer>
      </div>
    </main>
  );
}
