"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(() => {
          if (!("caches" in window)) return undefined;
          return caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith("linride-")).map((key) => caches.delete(key))));
        })
        .catch(() => undefined);
      return;
    }

    let reloading = false;
    const refreshForNewWorker = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    };

    navigator.serviceWorker.addEventListener("controllerchange", refreshForNewWorker);

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      window.removeEventListener("load", registerServiceWorker);
      navigator.serviceWorker.removeEventListener("controllerchange", refreshForNewWorker);
    };
  }, []);

  return null;
}
