"use client";

import { registerPushSubscription, unregisterPushSubscription } from "@/lib/backend";
import { supabase } from "@/lib/supabase";

export type NotificationEvent =
  | { type: "ride_request"; rideRequestId: string }
  | { type: "trip_status"; tripId: string }
  | { type: "driver_near"; tripId: string }
  | { type: "message"; messageId: string }
  | { type: "call"; signalId: string };

export type PhoneNotificationState = "unsupported" | "default" | "denied" | "enabled";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function getPhoneNotificationState(): PhoneNotificationState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "enabled";
  return Notification.permission;
}

export async function enablePhoneNotifications() {
  if (getPhoneNotificationState() === "unsupported") {
    throw new Error("Phone alerts are not supported by this browser. Install Lin Ride or try Chrome, Edge, or Safari.");
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "Phone alerts are blocked in your browser settings." : "Phone alert permission was not granted.");
  }

  const response = await fetch("/api/notifications", { cache: "no-store" });
  if (!response.ok) throw new Error("Phone alerts are temporarily unavailable.");
  const config = await response.json() as { configured?: boolean; publicKey?: string };
  if (!config.configured || !config.publicKey) throw new Error("Phone alerts are not configured on this Lin Ride server yet.");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });
  }
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    throw new Error("This phone did not return a valid alert subscription.");
  }
  await registerPushSubscription({
    endpoint: serialized.endpoint,
    p256dh: serialized.keys.p256dh,
    auth: serialized.keys.auth,
    userAgent: navigator.userAgent
  });
  return subscription;
}

export async function disablePhoneNotifications() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await unregisterPushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

export async function showAppNotification(
  title: string,
  options: { body: string; tag: string; url?: string }
) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const notificationOptions: NotificationOptions = {
    body: options.body,
    tag: options.tag,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: options.url || "/" }
  };
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) {
    await registration.showNotification(title, notificationOptions);
    return;
  }
  try {
    new Notification(title, notificationOptions);
  } catch {
    // Mobile browsers require service-worker notifications.
  }
}

export async function sendNotificationEvent(event: NotificationEvent) {
  if (!supabase) return { delivered: 0 };
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { delivered: 0 };
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(event)
    });
    if (!response.ok) return { delivered: 0 };
    return await response.json() as { delivered: number };
  } catch {
    return { delivered: 0 };
  }
}
