"use client";

import { useEffect, useState } from "react";

type LoadingScreenProps = {
  onComplete: () => void;
};

const statuses = ["Finding the nearest route...", "Loading service areas...", "Syncing driver network..."];

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length);
    }, 900);

    const hideTimer = window.setTimeout(() => {
      setHiding(true);
    }, 2200);

    const completeTimer = window.setTimeout(onComplete, 2850);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <main className={`linride-boot ${hiding ? "linride-boot-hide" : ""}`} aria-label="Loading Lin Ride">
      <div className="linride-road" />
      <div className="linride-boot-mark">
        <span className="linride-boot-logo" aria-hidden="true" />
        <span className="sr-only">LinRide</span>
      </div>
      <p className="linride-boot-sub">Built for country areas in Jamaica</p>
      <p className="linride-boot-status">{statuses[statusIndex]}</p>
    </main>
  );
}
