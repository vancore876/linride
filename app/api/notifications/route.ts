import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import webpush from "web-push";
import type { NotificationEvent } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PushPayload = { title: string; body: string; tag: string; url: string };
type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

const globalDatabase = globalThis as typeof globalThis & { linRideNotificationPool?: Pool };

function notificationConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "";
  return { publicKey, privateKey, subject, configured: Boolean(publicKey && privateKey && subject) };
}

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!globalDatabase.linRideNotificationPool) {
    globalDatabase.linRideNotificationPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false }
    });
  }
  return globalDatabase.linRideNotificationPool;
}

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

async function reserveEvent(eventKey: string, actorId: string) {
  const result = await database().query(
    `insert into public.push_notification_events (event_key, actor_id)
     values ($1, $2)
     on conflict (event_key) do nothing
     returning event_key`,
    [eventKey, actorId]
  );
  return result.rowCount === 1;
}

async function subscriptionsForUsers(userIds: string[]) {
  if (!userIds.length) return [] as PushSubscriptionRow[];
  const result = await database().query<PushSubscriptionRow>(
    `select id, endpoint, p256dh, auth
     from public.push_subscriptions
     where user_id = any($1::uuid[])`,
    [userIds]
  );
  return result.rows;
}

async function sendPushNotifications(subscriptions: PushSubscriptionRow[], payload: PushPayload) {
  const expiredIds: string[] = [];
  let delivered = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
        { TTL: 120, urgency: "high" }
      );
      delivered += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id);
    }
  }));
  if (expiredIds.length) {
    await database().query("delete from public.push_subscriptions where id = any($1::uuid[])", [expiredIds]);
  }
  return delivered;
}

async function prepareRideRequest(event: Extract<NotificationEvent, { type: "ride_request" }>, actorId: string) {
  const requestResult = await database().query<{
    id: string; pickup_name: string | null; destination_name: string | null; offered_fare_jmd: number | null;
  }>(
    `select id, pickup_name, destination_name, offered_fare_jmd
     from public.ride_requests
     where id = $1 and rider_id = $2
       and status in ('pending','requested','offered','countered')`,
    [event.rideRequestId, actorId]
  );
  const ride = requestResult.rows[0];
  if (!ride) return null;
  if (!await reserveEvent(`ride-request:${ride.id}`, actorId)) return { duplicate: true as const };

  const drivers = await database().query<{ user_id: string }>(
    `select distinct driver.user_id
     from public.drivers driver
     where driver.user_id <> $1
       and driver.status = 'approved'
       and driver.documents_status = 'approved'
       and exists (
         select 1 from public.driver_subscriptions subscription
         where subscription.driver_id = driver.id
           and subscription.status = 'active'
           and subscription.expires_at > now()
       )
       and not exists (
         select 1 from public.trips trip
         where trip.driver_id = driver.id
           and trip.status in ('requested','offered','accepted','driver_arriving','arrived','in_progress')
       )`,
    [actorId]
  );
  return {
    userIds: drivers.rows.map((row) => row.user_id),
    payload: {
      title: "New Lin Ride request",
      body: `${ride.pickup_name || "Pickup"} to ${ride.destination_name || "destination"} - J$${Number(ride.offered_fare_jmd || 0).toLocaleString("en-JM")}`,
      tag: `ride-request-${ride.id}`,
      url: "/?view=driver"
    }
  };
}

async function prepareTripStatus(event: Extract<NotificationEvent, { type: "trip_status" }>, actorId: string) {
  const result = await database().query<{
    id: string; status: string; rider_id: string; driver_user_id: string; driver_name: string | null;
  }>(
    `select trip.id, trip.status, trip.rider_id, driver.user_id as driver_user_id, profile.full_name as driver_name
     from public.trips trip
     join public.drivers driver on driver.id = trip.driver_id
     join public.profiles profile on profile.id = driver.user_id
     where trip.id = $1`,
    [event.tripId]
  );
  const trip = result.rows[0];
  if (!trip || trip.driver_user_id !== actorId || !["driver_arriving", "arrived"].includes(trip.status)) return null;
  if (!await reserveEvent(`trip-status:${trip.id}:${trip.status}`, actorId)) return { duplicate: true as const };
  const arrived = trip.status === "arrived";
  return {
    userIds: [trip.rider_id],
    payload: {
      title: arrived ? "Your driver is nearby" : "Your driver is on the way",
      body: arrived
        ? `${trip.driver_name || "Your driver"} has arrived at the pickup point.`
        : `${trip.driver_name || "Your driver"} is driving to your pickup.` ,
      tag: `trip-status-${trip.id}`,
      url: "/?view=rider"
    }
  };
}

async function prepareMessage(event: Extract<NotificationEvent, { type: "message" }>, actorId: string) {
  const result = await database().query<{
    id: string; body: string; sender_id: string; sender_name: string | null; rider_id: string; driver_user_id: string;
  }>(
    `select message.id, message.body, message.sender_id, sender.full_name as sender_name,
            trip.rider_id, driver.user_id as driver_user_id
     from public.trip_messages message
     join public.trips trip on trip.id = message.trip_id
     join public.drivers driver on driver.id = trip.driver_id
     join public.profiles sender on sender.id = message.sender_id
     where message.id = $1`,
    [event.messageId]
  );
  const message = result.rows[0];
  if (!message || message.sender_id !== actorId) return null;
  const recipientId = actorId === message.rider_id ? message.driver_user_id : actorId === message.driver_user_id ? message.rider_id : null;
  if (!recipientId) return null;
  if (!await reserveEvent(`trip-message:${message.id}`, actorId)) return { duplicate: true as const };
  const preview = message.body.length > 110 ? `${message.body.slice(0, 107)}...` : message.body;
  return {
    userIds: [recipientId],
    payload: {
      title: `Message from ${message.sender_name || "your Lin Ride contact"}`,
      body: preview,
      tag: `trip-message-${message.id}`,
      url: "/"
    }
  };
}

async function prepareCall(event: Extract<NotificationEvent, { type: "call" }>, actorId: string) {
  const result = await database().query<{
    id: string; sender_id: string; recipient_id: string; signal_type: string; sender_name: string | null;
  }>(
    `select signal.id, signal.sender_id, signal.recipient_id, signal.signal_type, sender.full_name as sender_name
     from public.trip_call_signals signal
     join public.profiles sender on sender.id = signal.sender_id
     where signal.id = $1`,
    [event.signalId]
  );
  const signal = result.rows[0];
  if (!signal || signal.sender_id !== actorId || signal.signal_type !== "offer") return null;
  if (!await reserveEvent(`trip-call:${signal.id}`, actorId)) return { duplicate: true as const };
  return {
    userIds: [signal.recipient_id],
    payload: {
      title: "Incoming Lin Ride audio call",
      body: `${signal.sender_name || "Your trip contact"} is calling through Lin Ride.`,
      tag: `trip-call-${signal.id}`,
      url: "/"
    }
  };
}

export async function GET() {
  const config = notificationConfig();
  return NextResponse.json(
    { configured: config.configured, publicKey: config.configured ? config.publicKey : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const config = notificationConfig();
  if (!config.configured || !process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Phone alerts are not configured." }, { status: 503 });
  }
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to send phone alerts." }, { status: 401 });

  try {
    const event = await request.json() as NotificationEvent;
    if (!event || typeof event.type !== "string") {
      return NextResponse.json({ error: "Invalid notification event." }, { status: 400 });
    }

    const prepared = event.type === "ride_request"
      ? await prepareRideRequest(event, user.id)
      : event.type === "trip_status"
        ? await prepareTripStatus(event, user.id)
        : event.type === "message"
          ? await prepareMessage(event, user.id)
          : event.type === "call"
            ? await prepareCall(event, user.id)
            : null;
    if (!prepared) return NextResponse.json({ error: "Notification event is not allowed." }, { status: 403 });
    if ("duplicate" in prepared) return NextResponse.json({ delivered: 0, duplicate: true });

    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    const subscriptions = await subscriptionsForUsers(prepared.userIds);
    const delivered = await sendPushNotifications(subscriptions, prepared.payload);
    return NextResponse.json({ delivered });
  } catch {
    return NextResponse.json({ error: "Phone alert could not be sent." }, { status: 500 });
  }
}
