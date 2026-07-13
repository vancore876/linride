"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import {
  disablePhoneNotifications,
  enablePhoneNotifications,
  getPhoneNotificationState,
  PhoneNotificationState
} from "@/lib/notifications";

export function NotificationSettings({ role }: { role: "rider" | "driver" }) {
  const [state, setState] = useState<PhoneNotificationState>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const browserState = getPhoneNotificationState();
    setState(browserState);
    if (browserState !== "enabled" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "enabled" : "default"))
      .catch(() => setState("default"));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      await enablePhoneNotifications();
      setState("enabled");
      setMessage("Phone alerts are on for this device.");
    } catch (error) {
      const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "enabled" : Notification.permission === "denied" ? "denied" : "default");
      setMessage(error instanceof Error ? error.message : "Phone alerts could not be enabled.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      await disablePhoneNotifications();
      setState("default");
      setMessage("Phone alerts are off for this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Phone alerts could not be disabled.");
    } finally {
      setBusy(false);
    }
  }

  const helper = role === "driver"
    ? "Get new ride requests, messages, and incoming call alerts on this phone."
    : "Get driver arrival, message, and incoming call alerts on this phone.";

  return (
    <section className="linride-card mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linred/15 text-linred">
          {state === "enabled" ? <Bell size={20} /> : <BellOff size={20} />}
        </span>
        <div>
          <p className="text-sm font-black text-charcoal">Phone alerts</p>
          <p className="mt-1 max-w-xl text-xs font-bold leading-5 text-charcoal/58">{helper}</p>
          {message && <p className={`mt-1 text-xs font-black ${state === "enabled" ? "text-linred" : "text-charcoal/62"}`}>{message}</p>}
          {state === "denied" && <p className="mt-1 text-xs font-black text-linred">Allow notifications in this site&apos;s browser settings, then reload Lin Ride.</p>}
          {state === "unsupported" && <p className="mt-1 text-xs font-black text-charcoal/62">Install Lin Ride or open it in a browser that supports web push.</p>}
        </div>
      </div>
      {state === "enabled" ? (
        <button type="button" disabled={busy} onClick={() => void disable()} className="rounded-2xl bg-smoke px-4 py-3 text-xs font-black text-charcoal disabled:opacity-50">
          {busy ? "Updating..." : "Turn off"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || state === "denied" || state === "unsupported"}
          onClick={() => void enable()}
          className="flex items-center gap-2 rounded-2xl bg-linred px-4 py-3 text-xs font-black text-ink disabled:opacity-45"
        >
          {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Bell size={16} />}
          {busy ? "Enabling..." : "Enable alerts"}
        </button>
      )}
    </section>
  );
}
