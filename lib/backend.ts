import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import {
  BoostTag,
  BusinessAccount,
  BusinessDelivery,
  BusinessDeliveryOffer,
  Driver,
  DriverDocumentsStatus,
  DriverEarningsSummary,
  DriverOffer,
  DriverSubscriptionStatus,
  DriverWithdrawalRequest,
  LinRideReport,
  PaymentMethod,
  PassengerWithdrawalRequest,
  Place,
  Profile,
  PointsRuleSettings,
  PointsTransaction,
  PointsWallet,
  RideRequest,
  Role,
  ServiceType,
  SupportTicket,
  TripProofPhoto,
  TripCallSignal,
  TripCallSignalType,
  TripMessage,
  TripRating,
  TripRecord,
  TripStatus,
  VehicleType,
  RouteDetails
} from "@/types/linride";

function requireSupabase() {
  if (!supabase) throw new Error("Could not connect to Lin Ride. Check your internet.");
  return supabase;
}

const OAUTH_PROFILE_STORAGE_KEY = "linride-google-profile";

function authErrorCode(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  if (code) return code;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("email not confirmed")) return "email_not_confirmed";
  if (message.includes("email rate limit exceeded")) return "over_email_send_rate_limit";
  if (message.includes("rate limit")) return "over_request_rate_limit";
  if (message.includes("invalid login credentials")) return "invalid_credentials";
  return "";
}

function friendlyAuthMessage(error: unknown, fallback: string) {
  const code = authErrorCode(error);
  if (code === "email_not_confirmed") {
    return "This account is still being activated. Try signing in again or continue with Google.";
  }
  if (code === "over_email_send_rate_limit") {
    return "Too many signup attempts were made. Wait a few minutes, then try again or continue with Google.";
  }
  if (code === "over_request_rate_limit") {
    return "Too many requests were made. Wait a few minutes, then try again.";
  }
  if (code === "email_address_not_authorized") {
    return "This email address cannot be used right now. Continue with Google or use another email.";
  }
  if (code === "invalid_credentials") return "Email or password is incorrect.";
  if (code === "user_already_exists" || code === "email_exists") {
    return "An account with this email already exists. Sign in instead.";
  }

  const message = error instanceof Error ? error.message : "";
  return message || fallback;
}

async function completePendingPasswordAccount(email: string, password: string) {
  const response = await fetch("/api/auth/complete-signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(result?.error || "Could not activate this Lin Ride account.");
  }
}

async function signInWithCompletedPassword(
  client: ReturnType<typeof requireSupabase>,
  email: string,
  password: string
) {
  let signIn = await client.auth.signInWithPassword({ email, password });
  if (authErrorCode(signIn.error) === "email_not_confirmed") {
    await completePendingPasswordAccount(email, password);
    signIn = await client.auth.signInWithPassword({ email, password });
  }
  return signIn;
}

function publicAccountRole(value: unknown, fallback: Role): Exclude<Role, "admin"> {
  if (value === "rider" || value === "driver" || value === "business") return value;
  return fallback === "admin" ? "rider" : fallback;
}

async function loadOrCreateProfile(
  client: ReturnType<typeof requireSupabase>,
  user: User,
  defaults: { role: Role; fullName?: string; phone?: string }
) {
  const { data: existing, error: readError } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (readError) throw new Error(readError.message);

  const metadata = user.user_metadata || {};
  const role = publicAccountRole(metadata.role, defaults.role);
  const metadataName = typeof metadata.full_name === "string"
    ? metadata.full_name.trim()
    : typeof metadata.name === "string"
      ? metadata.name.trim()
      : "";
  const metadataPhone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";
  const metadataAvatar = typeof metadata.avatar_url === "string"
    ? metadata.avatar_url.trim()
    : typeof metadata.picture === "string"
      ? metadata.picture.trim()
      : "";
  const fullName = metadataName || defaults.fullName?.trim() || "Lin Ride user";
  const phone = metadataPhone || defaults.phone?.trim() || null;

  if (existing) {
    const updates: Record<string, string> = {};
    if (!existing.full_name && fullName) updates.full_name = fullName;
    if (!existing.phone && phone) updates.phone = phone;
    if (!existing.avatar_url && metadataAvatar) updates.avatar_url = metadataAvatar;
    if (Object.keys(updates).length === 0) return existing;

    const { data: updated, error: updateError } = await client
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated;
  }

  const { data, error } = await client
    .from("profiles")
    .insert({ id: user.id, role, full_name: fullName, phone, avatar_url: metadataAvatar || null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function friendlyBackendMessage(error: unknown, fallback: string) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("already accepted")) return "Request already accepted by another driver.";
  if (normalized.includes("trip pin") || normalized.includes("entered_pin")) return "Trip PIN is incorrect.";
  if (normalized.includes("active pass") || normalized.includes("weekly subscription")) {
    return "Your weekly Lin Ride driver pass has expired. Pay J$2,000 to continue receiving requests.";
  }
  if (normalized.includes("documents") && normalized.includes("approved")) {
    return "Your driver documents must be approved before you can receive requests.";
  }
  if (normalized.includes("row-level security") || normalized.includes("permission") || normalized.includes("access denied")) {
    return "You do not have permission to do that.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("timeout")) {
    return "Could not connect to Lin Ride. Check your internet.";
  }
  return fallback;
}

function privateStoragePath(bucket: string, storedValue?: string | null) {
  if (!storedValue) return null;
  const decoded = decodeURIComponent(storedValue);
  const markers = [`/object/public/${bucket}/`, `/object/sign/${bucket}/`, `/object/authenticated/${bucket}/`];
  for (const marker of markers) {
    const markerIndex = decoded.indexOf(marker);
    if (markerIndex >= 0) return decoded.slice(markerIndex + marker.length).split("?")[0];
  }
  return decoded.replace(/^\/+/, "").split("?")[0];
}

async function createSignedStorageUrl(bucket: string, storedValue?: string | null) {
  const path = privateStoragePath(bucket, storedValue);
  if (!path) return null;
  const client = requireSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 15 * 60);
  if (error) return null;
  return data.signedUrl;
}

function mapDriverRow(row: any): Driver {
  const profile = Array.isArray(row?.profiles) ? row.profiles[0] : row?.profiles;
  return {
    id: row?.id || "driver",
    profile: {
      id: profile?.id || row?.user_id || row?.id || "driver-profile",
      role: (profile?.role || "driver") as Role,
      fullName: profile?.full_name || "Lin Ride driver",
      phone: profile?.phone || "876-000-0000",
      avatarUrl: profile?.avatar_url || undefined
    },
    status: row?.status || "pending",
    documentsStatus: (row?.documents_status || "missing") as DriverDocumentsStatus,
    documentsRejectionReason: row?.documents_rejection_reason || undefined,
    vehicleType: (row?.vehicle_type || "Car") as VehicleType,
    vehicleMake: row?.vehicle_make || "Vehicle",
    vehicleModel: row?.vehicle_model || "",
    vehicleColor: row?.vehicle_color || "",
    plateNumber: row?.plate_number || "No plate",
    lat: Number(row?.lat || row?.driver_locations?.lat || 18.1366),
    lng: Number(row?.lng || row?.driver_locations?.lng || -77.031),
    subscriptionStatus: (row?.subscription_status || "active") as DriverSubscriptionStatus,
    subscriptionExpiresAt: row?.subscription_expires_at || undefined,
    badges: ["Verified Driver", "Local Linstead Driver"]
  };
}

function mapTripRow(row: any): TripRecord {
  const request = Array.isArray(row?.ride_requests) ? row.ride_requests[0] : row?.ride_requests;
  return {
    id: row.id,
    rideRequestId: row.ride_request_id,
    riderId: row.rider_id,
    driverId: row.driver_id,
    agreedFareJmd: row.agreed_fare_jmd,
    tripPin: row.trip_pin,
    pinVerified: Boolean(row.pin_verified),
    status: row.status === "arriving" ? "driver_arriving" : row.status,
    driverArrivingAt: row.driver_arriving_at,
    arrivedAt: row.arrived_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    pickupName: request?.pickup_name,
    destinationName: request?.destination_name,
    serviceType: request?.service_type,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function mapTripMessageRow(row: any): TripMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapTripCallSignalRow(row: any): TripCallSignal {
  return {
    id: row.id,
    callId: row.call_id,
    tripId: row.trip_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    signalType: row.signal_type as TripCallSignalType,
    payload: row.payload || {},
    createdAt: row.created_at
  };
}

function mapBusinessDeliveryRow(row: any): BusinessDelivery {
  const business = Array.isArray(row?.business_accounts) ? row.business_accounts[0] : row?.business_accounts;
  const acceptedDriver = Array.isArray(row?.drivers) ? row.drivers[0] : row?.drivers;
  const statusMap: Record<string, BusinessDelivery["status"]> = {
    pending: "Pending",
    searching: "Searching",
    accepted: "Accepted",
    picking_up: "Picking up",
    picked_up: "Picked up",
    delivering: "Delivering",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };
  return {
    id: row.id,
    businessName: business?.business_name || row.pickup_business_name || "Business delivery",
    businessType: business?.business_type || "Business",
    pickupBusinessName: row.pickup_business_name || business?.business_name,
    pickupAddress: row.pickup_address || "Pickup",
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    dropoffAddress: row.dropoff_address || "Drop-off",
    packageDetails: row.package_details || "",
    deliveryOfferJmd: row.delivery_offer_jmd || 0,
    cashCollectionRequired: Boolean(row.cash_collection_required),
    cashCollectionAmountJmd: row.cash_collection_amount_jmd || undefined,
    notes: row.notes || "",
    status: statusMap[row.status] || "Searching",
    acceptedDriverId: row.accepted_driver_id,
    acceptedDriver: acceptedDriver ? mapDriverRow(acceptedDriver) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBusinessAccountRow(row: any): BusinessAccount {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name || "Lin Ride business",
    businessType: row.business_type || "Business",
    phone: row.phone || "",
    address: row.address || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSupportTicketRow(row: any): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category || "other",
    message: row.message || "",
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPassengerWithdrawalRow(row: any): PassengerWithdrawalRequest {
  return {
    id: row.id,
    userId: row.user_id,
    points: Number(row.points || 0),
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    branch: row.branch,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDriverWithdrawalRow(row: any): DriverWithdrawalRequest {
  return {
    id: row.id,
    driverId: row.driver_id,
    amountJmd: Number(row.amount_jmd || 0),
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    branch: row.branch,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function signInOrCreateProfile(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
}) {
  const client = requireSupabase();
  const signIn = await client.auth.signInWithPassword({ email: params.email, password: params.password });
  let user = signIn.data.user;
  let authError = signIn.error;

  if (authError) {
    const signUp = await client.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone,
          role: params.role
        }
      }
    });
    user = signUp.data.user;
    authError = signUp.error;
  }

  if (authError || !user) {
    throw new Error(authError?.message || "Could not sign in to Lin Ride.");
  }

  const { data: existing } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  let profile = existing;

  if (!existing) {
    const { data, error } = await client.from("profiles").insert({
      id: user.id,
      role: params.role,
      full_name: params.fullName,
      phone: params.phone
    }).select("*").single();
    if (error) throw new Error(error.message);
    profile = data;
  }

  return { user, profile };
}

export async function signUpWithProfile(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
}) {
  const client = requireSupabase();
  const role = params.role === "admin" ? "rider" : params.role;
  await client.auth.signOut({ scope: "local" });

  const existingSignIn = await signInWithCompletedPassword(client, params.email, params.password);
  if (!existingSignIn.error && existingSignIn.data.user) {
    const profile = await loadOrCreateProfile(client, existingSignIn.data.user, {
      role,
      fullName: params.fullName,
      phone: params.phone
    });
    return { user: existingSignIn.data.user, profile };
  }
  if (existingSignIn.error && authErrorCode(existingSignIn.error) !== "invalid_credentials") {
    throw new Error(friendlyAuthMessage(existingSignIn.error, "Could not check this Lin Ride account."));
  }

  const signUp = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      data: {
        full_name: params.fullName,
        phone: params.phone,
        role
      }
    }
  });

  if ((signUp.error || !signUp.data.user) && authErrorCode(signUp.error) === "over_email_send_rate_limit") {
    const completedSignIn = await signInWithCompletedPassword(client, params.email, params.password);
    if (!completedSignIn.error && completedSignIn.data.user) {
      const profile = await loadOrCreateProfile(client, completedSignIn.data.user, {
        role,
        fullName: params.fullName,
        phone: params.phone
      });
      return { user: completedSignIn.data.user, profile };
    }
  }

  if (signUp.error || !signUp.data.user) {
    throw new Error(friendlyAuthMessage(signUp.error, "Could not create your Lin Ride account."));
  }

  if (!signUp.data.session) {
    const completedSignIn = await signInWithCompletedPassword(client, params.email, params.password);
    if (completedSignIn.error || !completedSignIn.data.user) {
      throw new Error(friendlyAuthMessage(completedSignIn.error, "Could not open your new Lin Ride account."));
    }
    const profile = await loadOrCreateProfile(client, completedSignIn.data.user, {
      role,
      fullName: params.fullName,
      phone: params.phone
    });
    return { user: completedSignIn.data.user, profile };
  }

  const profile = await loadOrCreateProfile(client, signUp.data.user, {
    role,
    fullName: params.fullName,
    phone: params.phone
  });
  return { user: signUp.data.user, profile };
}

export async function signInWithProfile(params: {
  email: string;
  password: string;
  fallbackRole: Role;
}) {
  const client = requireSupabase();
  const signIn = await signInWithCompletedPassword(client, params.email, params.password);
  if (signIn.error || !signIn.data.user) {
    throw new Error(friendlyAuthMessage(signIn.error, "Could not sign in to Lin Ride."));
  }
  const profile = await loadOrCreateProfile(client, signIn.data.user, { role: params.fallbackRole });
  return { user: signIn.data.user, profile };
}

export async function signInWithGoogle(params: {
  role: Exclude<Role, "admin">;
  fullName?: string;
  phone?: string;
}) {
  const client = requireSupabase();
  if (typeof window === "undefined") throw new Error("Google sign-in must be started from the Lin Ride app.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Google sign-in is not configured yet.");

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } });
    if (response.ok) {
      const settings = await response.json() as { external?: { google?: boolean } };
      if (settings.external?.google !== true) {
        throw new Error("Google sign-in still needs to be enabled in the Lin Ride authentication settings.");
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("still needs to be enabled")) throw error;
    throw new Error("Could not connect to Google sign-in. Check your internet and try again.");
  }

  window.localStorage.setItem(OAUTH_PROFILE_STORAGE_KEY, JSON.stringify({
    role: params.role,
    fullName: params.fullName?.trim() || "",
    phone: params.phone?.trim() || ""
  }));

  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/` }
  });
  if (error) {
    window.localStorage.removeItem(OAUTH_PROFILE_STORAGE_KEY);
    throw new Error(friendlyAuthMessage(error, "Could not start Google sign-in."));
  }
}

export async function restoreSignedInProfile() {
  const client = requireSupabase();
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) {
    if (error) await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }

  let defaults: { role: Role; fullName?: string; phone?: string } = { role: "rider" };
  if (typeof window !== "undefined") {
    try {
      const saved = JSON.parse(window.localStorage.getItem(OAUTH_PROFILE_STORAGE_KEY) || "null") as {
        role?: unknown;
        fullName?: unknown;
        phone?: unknown;
      } | null;
      if (saved) {
        defaults = {
          role: publicAccountRole(saved.role, "rider"),
          fullName: typeof saved.fullName === "string" ? saved.fullName : undefined,
          phone: typeof saved.phone === "string" ? saved.phone : undefined
        };
      }
    } catch {
      defaults = { role: "rider" };
    }
  }

  const profile = await loadOrCreateProfile(client, auth.user, defaults);
  if (typeof window !== "undefined") window.localStorage.removeItem(OAUTH_PROFILE_STORAGE_KEY);
  return { user: auth.user, profile };
}

export async function signInAdmin(params: { email: string; password: string }) {
  const client = requireSupabase();
  const signIn = await client.auth.signInWithPassword({ email: params.email, password: params.password });
  if (signIn.error || !signIn.data.user) {
    throw new Error(signIn.error?.message || "Could not sign in to Lin Ride.");
  }

  const { data: profile, error } = await client.from("profiles").select("*").eq("id", signIn.data.user.id).maybeSingle();
  if (error || profile?.role !== "admin") {
    await client.auth.signOut();
    throw new Error("This account is not authorized for the Lin Ride control room.");
  }

  return { user: signIn.data.user, profile };
}

export async function signOutCurrentUser() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw new Error("Could not sign out. Try again.");
}

export async function getCurrentProfile() {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await client.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureDriverProfile(userId: string) {
  const client = requireSupabase();
  const { data: existing, error: readError } = await client.from("drivers").select("*").eq("user_id", userId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) return existing;

  const { data, error } = await client
    .from("drivers")
    .insert({
      user_id: userId,
      status: "pending",
      documents_status: "missing"
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchDriverAccount(driverId: string): Promise<Driver> {
  const client = requireSupabase();
  const { data: driver, error } = await client
    .from("drivers")
    .select("*, profiles:user_id(id,role,full_name,phone,avatar_url)")
    .eq("id", driverId)
    .single();
  if (error) throw new Error(error.message);

  const { data: subscription } = await client
    .from("driver_subscriptions")
    .select("status,expires_at,created_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return mapDriverRow({
    ...driver,
    subscription_status: subscription?.status || "inactive",
    subscription_expires_at: subscription?.expires_at || undefined
  });
}

export function subscribeToDriverAccount(driverId: string, onChange: (driver: Driver) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => void fetchDriverAccount(driverId).then(onChange).catch(onError);
  const channel = client
    .channel(`driver-account:${driverId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "drivers", filter: `id=eq.${driverId}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "driver_subscriptions", filter: `driver_id=eq.${driverId}` }, refresh)
    .subscribe();
  refresh();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function markDriverDocumentsSubmitted(driverId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("drivers")
    .update({ documents_status: "pending", documents_submitted_at: new Date().toISOString() })
    .eq("id", driverId);
  if (error) throw new Error(error.message);
}

export async function updateDriverDocumentsStatus(
  driverId: string,
  status: "approved" | "rejected",
  adminId: string,
  rejectionReason?: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from("drivers")
    .update({
      documents_status: status,
      documents_rejection_reason: status === "rejected" ? rejectionReason || "Google Form verification was rejected." : null,
      documents_approved_at: status === "approved" ? new Date().toISOString() : null,
      documents_approved_by: status === "approved" ? adminId : null
    })
    .eq("id", driverId);
  if (error) throw new Error(error.message);
}

export async function uploadProfilePhoto(userId: string, file: File) {
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Your sign-in expired. Sign out, sign in again, then upload your photo.");
  if (auth.user.id !== userId) throw new Error("This photo does not match the signed-in account. Sign in again and retry.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile photo must be smaller than 5 MB.");

  const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensionByType[file.type] || file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${auth.user.id}/profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { data: existingProfile, error: existingProfileError } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (existingProfileError) throw new Error("Your current profile photo could not be checked. Try again.");

  const upload = await client.storage.from("profile-photos").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600"
  });
  if (upload.error) {
    const detail = upload.error.message.toLowerCase();
    if (detail.includes("row-level security") || detail.includes("unauthorized")) {
      throw new Error("Photo permission expired. Sign out, sign in again, then retry.");
    }
    if (detail.includes("bucket")) throw new Error("Profile photo storage is temporarily unavailable.");
    throw new Error(`Photo upload failed: ${upload.error.message}`);
  }
  const { data: publicUrl } = client.storage.from("profile-photos").getPublicUrl(path);
  if (!publicUrl.publicUrl) {
    await client.storage.from("profile-photos").remove([path]);
    throw new Error("The uploaded photo URL could not be created.");
  }
  const { data: updatedProfile, error } = await client
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", auth.user.id)
    .select("avatar_url")
    .maybeSingle();
  if (error || !updatedProfile?.avatar_url) {
    await client.storage.from("profile-photos").remove([path]);
    throw new Error(error?.message || "The profile could not be updated with this photo.");
  }

  const previousPath = ownedProfilePhotoPath(existingProfile?.avatar_url, auth.user.id);
  if (previousPath && previousPath !== path) {
    await client.storage.from("profile-photos").remove([previousPath]).catch(() => undefined);
  }
  return updatedProfile.avatar_url;
}

function ownedProfilePhotoPath(photoUrl: string | null | undefined, userId: string) {
  if (!photoUrl) return null;
  const marker = "/storage/v1/object/public/profile-photos/";
  try {
    const pathname = new URL(photoUrl).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function removeProfilePhoto(userId: string) {
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Your sign-in expired. Sign out, sign in again, then retry.");
  if (auth.user.id !== userId) throw new Error("This photo does not match the signed-in account. Sign in again and retry.");

  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (profileError || !currentProfile) throw new Error("Your profile photo could not be loaded. Try again.");

  const path = ownedProfilePhotoPath(currentProfile.avatar_url, auth.user.id);
  if (path) {
    const removed = await client.storage.from("profile-photos").remove([path]);
    if (removed.error) {
      const detail = removed.error.message.toLowerCase();
      if (detail.includes("row-level security") || detail.includes("unauthorized")) {
        throw new Error("Photo permission expired. Sign out, sign in again, then retry.");
      }
      throw new Error(`Photo removal failed: ${removed.error.message}`);
    }
  }

  const { error } = await client
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", auth.user.id);
  if (error) throw new Error("The photo was removed, but your profile could not be refreshed. Reload and try again.");
}

export async function uploadDriverDocument(params: {
  driverId: string;
  documentType: string;
  file: File;
}) {
  const client = requireSupabase();
  const extension = params.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${params.driverId}/${params.documentType}-${Date.now()}.${extension}`;
  const upload = await client.storage.from("driver-documents").upload(path, params.file, {
    upsert: false,
    contentType: params.file.type || undefined
  });
  if (upload.error) throw new Error("Upload failed. Try again.");

  const { error } = await client.rpc("register_driver_document", {
    p_driver_id: params.driverId,
    p_document_type: params.documentType,
    p_storage_path: path
  });
  if (error) {
    await client.storage.from("driver-documents").remove([path]);
    throw new Error(friendlyBackendMessage(error, "Document uploaded, but could not be submitted for review."));
  }
  return path;
}

export async function uploadDriverPaymentProof(params: {
  driverId: string;
  method: string;
  referenceNumber: string;
  note: string;
  file?: File | null;
}) {
  const client = requireSupabase();
  let proofUrl: string | null = null;

  if (params.file) {
    const extension = params.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${params.driverId}/payment-${Date.now()}.${extension}`;
    const upload = await client.storage.from("driver-payment-proofs").upload(path, params.file, {
      upsert: false,
      contentType: params.file.type || undefined
    });
    if (upload.error) throw new Error("Upload failed. Try again.");
    proofUrl = path;
  }

  const { data, error } = await client
    .from("driver_subscription_payments")
    .insert({
      driver_id: params.driverId,
      amount_jmd: DRIVER_WEEKLY_PASS_JMD,
      method: params.method,
      reference_number: params.referenceNumber,
      proof_url: proofUrl,
      note: params.note,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Payment proof could not be submitted. Try again."));
  return data;
}

export async function submitRideRequest(params: {
  riderId: string;
  pickup: Place;
  destination: Place;
  offeredFareJmd: number;
  suggestedMinJmd: number;
  suggestedMaxJmd: number;
  serviceType: ServiceType;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  boostTags: BoostTag[];
  boostTotalJmd: number;
  isShared: boolean;
  routeDetails?: RouteDetails;
  pickupLandmark?: string;
  destinationLandmark?: string;
  riderLocationNote?: string;
  scheduledTime?: string;
  callWhenNearby?: boolean;
  badRoadNote?: boolean;
  heavyItem?: boolean;
  fragileItem?: boolean;
  extraStop?: boolean;
  returnTrip?: boolean;
}) {
  const client = requireSupabase();
  const serviceTypeMap: Record<ServiceType, string> = {
    Ride: "ride",
    Delivery: "delivery",
    Errand: "errand",
    "Shopping pickup": "shopping_pickup",
    "Business delivery": "business_delivery",
    "School run": "school_run",
    "Moving help": "moving_help",
    "Route/shared ride": "shared_ride",
    "Urgent pickup": "urgent_pickup",
    "Shared Ride": "shared_ride",
    "Errand / Pickup": "errand",
    Courier: "courier",
    "Town to Town": "town_to_town"
  };

  const { data, error } = await client
    .from("ride_requests")
    .insert({
      rider_id: params.riderId,
      pickup_name: params.pickup.name,
      pickup_lat: params.pickup.lat,
      pickup_lng: params.pickup.lng,
      pickup_place_id: params.pickup.placeId || null,
      destination_name: params.destination.name,
      destination_lat: params.destination.lat,
      destination_lng: params.destination.lng,
      destination_place_id: params.destination.placeId || null,
      offered_fare_jmd: params.offeredFareJmd,
      suggested_min_jmd: params.suggestedMinJmd,
      suggested_max_jmd: params.suggestedMaxJmd,
      service_type: serviceTypeMap[params.serviceType],
      vehicle_type: params.vehicleType,
      payment_method: params.paymentMethod,
      boost_tags: params.boostTags,
      boost_total_jmd: params.boostTotalJmd,
      is_shared: params.isShared,
      distance_meters: params.routeDetails?.distanceMeters ?? null,
      estimated_duration_seconds: params.routeDetails?.durationSeconds ?? null,
      estimated_fare_jmd: params.offeredFareJmd,
      route_geometry: params.routeDetails?.routeGeometry ?? null,
      pickup_landmark: params.pickupLandmark || null,
      destination_landmark: params.destinationLandmark || null,
      rider_location_note: params.riderLocationNote || null,
      scheduled_time: params.scheduledTime || null,
      call_when_nearby: Boolean(params.callWhenNearby),
      bad_road_note: Boolean(params.badRoadNote),
      heavy_item: Boolean(params.heavyItem),
      fragile_item: Boolean(params.fragileItem),
      extra_stop: Boolean(params.extraStop),
      return_trip: Boolean(params.returnTrip),
      status: "pending"
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createBusinessAccount(params: {
  ownerId: string;
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_accounts")
    .insert({
      owner_id: params.ownerId,
      business_name: params.businessName,
      business_type: params.businessType,
      phone: params.phone,
      address: params.address,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Business account could not be created. Try again."));
  return mapBusinessAccountRow(data);
}

export async function fetchBusinessAccountForOwner(ownerId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_accounts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load your business account."));
  return data ? mapBusinessAccountRow(data) : null;
}

export function subscribeToBusinessAccount(ownerId: string, onChange: (account: BusinessAccount | null) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => void fetchBusinessAccountForOwner(ownerId).then(onChange).catch(onError);
  const channel = client
    .channel(`business-account:${ownerId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_accounts", filter: `owner_id=eq.${ownerId}` }, refresh)
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function submitBusinessDeliveryRequest(params: {
  businessId: string;
  delivery: BusinessDelivery;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_delivery_requests")
    .insert({
      business_id: params.businessId,
      pickup_business_name: params.delivery.pickupBusinessName || params.delivery.businessName,
      pickup_address: params.delivery.pickupAddress,
      customer_name: params.delivery.customerName,
      customer_phone: params.delivery.customerPhone,
      dropoff_address: params.delivery.dropoffAddress,
      package_details: params.delivery.packageDetails,
      delivery_offer_jmd: params.delivery.deliveryOfferJmd,
      cash_collection_required: params.delivery.cashCollectionRequired,
      cash_collection_amount_jmd: params.delivery.cashCollectionAmountJmd,
      notes: params.delivery.notes,
      status: "searching"
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function canDriverReceiveRequests(driverId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("can_driver_receive_requests", { p_driver_id: driverId });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function distanceBetweenKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(lat2 - lat1);
  const lngDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchPendingRideRequests(driverId?: string): Promise<RideRequest[]> {
  const client = requireSupabase();
  let driverLocation: { lat: number; lng: number } | null = null;
  if (driverId) {
    const { data: location } = await client
      .from("driver_locations")
      .select("lat,lng,updated_at")
      .eq("driver_id", driverId)
      .eq("is_online", true)
      .maybeSingle();
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && location?.updated_at && Date.now() - new Date(location.updated_at).getTime() < 5 * 60_000) {
      driverLocation = { lat, lng };
    }
  }
  const { data, error } = await client
    .from("ride_requests")
    .select("*, profiles:rider_id(full_name,avatar_url)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);

  const serviceTypeMap: Record<string, ServiceType> = {
    ride: "Ride",
    shared_ride: "Shared Ride",
    errand: "Errand / Pickup",
    courier: "Courier",
    town_to_town: "Town to Town",
    delivery: "Delivery",
    shopping_pickup: "Shopping pickup",
    business_delivery: "Business delivery",
    school_run: "School run",
    moving_help: "Moving help",
    urgent_pickup: "Urgent pickup"
  };

  const requests = (data || []).map((row) => {
    const riderProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
    id: row.id,
    pickup: {
      name: row.pickup_name || "Pickup",
      lat: Number(row.pickup_lat || 18.1366),
      lng: Number(row.pickup_lng || -77.031)
    },
    destination: {
      name: row.destination_name || "Destination",
      lat: Number(row.destination_lat || 18.1366),
      lng: Number(row.destination_lng || -77.031)
    },
    riderName: riderProfile?.full_name || "Passenger",
    riderAvatarUrl: riderProfile?.avatar_url || undefined,
    offeredFareJmd: row.offered_fare_jmd || 0,
    suggestedMinJmd: row.suggested_min_jmd || 0,
    suggestedMaxJmd: row.suggested_max_jmd || 0,
    serviceType: serviceTypeMap[row.service_type] || "Ride",
    vehicleType: (row.vehicle_type || "Standard") as VehicleType,
    paymentMethod: (row.payment_method || "Cash") as PaymentMethod,
    boostTags: (row.boost_tags || []) as BoostTag[],
    boostTotalJmd: row.boost_total_jmd || 0,
    isShared: row.is_shared || false,
    distanceKm: Number(row.distance_meters || 0) / 1000,
    status: row.status,
    scheduledTime: row.scheduled_time || undefined,
    pickupLandmark: row.pickup_landmark || undefined,
    destinationLandmark: row.destination_landmark || undefined,
    riderLocationNote: row.rider_location_note || undefined,
    callWhenNearby: Boolean(row.call_when_nearby),
    badRoadNote: Boolean(row.bad_road_note),
    heavyItem: Boolean(row.heavy_item),
    fragileItem: Boolean(row.fragile_item),
    extraStop: Boolean(row.extra_stop),
    returnTrip: Boolean(row.return_trip)
    };
  });
  if (!driverId) return requests;
  if (!driverLocation) return [];
  return requests.filter(
    (request) => distanceBetweenKm(driverLocation!.lat, driverLocation!.lng, request.pickup.lat, request.pickup.lng) <= 40
  );
}

export async function insertDriverOffer(params: {
  rideRequestId: string;
  driverId: string;
  offerType: "accept" | "counter";
  fareJmd?: number;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("driver_offers")
    .insert({
      ride_request_id: params.rideRequestId,
      driver_id: params.driverId,
      offer_type: params.offerType,
      fare_jmd: params.fareJmd,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function ignoreRideRequest(params: { rideRequestId: string; driverId: string; ignoredFareJmd: number }) {
  const client = requireSupabase();
  const { error } = await client.from("driver_request_ignores").insert({
    ride_request_id: params.rideRequestId,
    driver_id: params.driverId,
    ignored_fare_jmd: params.ignoredFareJmd
  });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function fetchAdminDashboardData() {
  const client = requireSupabase();
  const [
    drivers,
    documents,
    payments,
    subscriptions,
    businesses,
    deliveries,
    support,
    rideRequests,
    locations,
    trips,
    passengerWithdrawals,
    driverWithdrawals,
    reports,
    auditLogs,
    ratings,
    pointsRules
  ] = await Promise.all([
    client.from("drivers").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false }),
    client.from("driver_documents").select("*, drivers(driver:profiles!drivers_user_id_fkey(full_name, phone), plate_number, vehicle_make, vehicle_model)").eq("is_current", true).order("uploaded_at", { ascending: false }),
    client.from("driver_subscription_payments").select("*, drivers(profiles:user_id(full_name, phone), plate_number)").order("created_at", { ascending: false }),
    client.from("driver_subscriptions").select("*, drivers(profiles:user_id(full_name, phone), plate_number)").order("created_at", { ascending: false }),
    client.from("business_accounts").select("*, profiles:owner_id(full_name)").order("created_at", { ascending: false }),
    client.from("business_delivery_requests").select("*, business_accounts(business_name, business_type)").order("created_at", { ascending: false }),
    client.from("support_tickets").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false }),
    client.from("ride_requests").select("*").order("created_at", { ascending: false }).limit(30),
    client.from("driver_locations").select("*, drivers(profiles:user_id(full_name), plate_number)").eq("is_online", true),
    client.from("trips").select("*, ride_requests(pickup_name,destination_name,service_type), drivers(profiles:user_id(full_name,phone),plate_number)").order("created_at", { ascending: false }).limit(50),
    client.from("passenger_withdrawal_requests").select("*, profiles:user_id(full_name,phone)").order("created_at", { ascending: false }),
    client.from("driver_withdrawal_requests").select("*, drivers(profiles:user_id(full_name,phone),plate_number)").order("created_at", { ascending: false }),
    client.from("reports").select("*, profiles:reporter_id(full_name,phone)").order("created_at", { ascending: false }),
    client.from("admin_audit_logs").select("*, profiles:admin_id(full_name)").order("created_at", { ascending: false }).limit(100),
    client.from("ratings").select("*").order("created_at", { ascending: false }).limit(100),
    client.from("platform_settings").select("value").eq("key", "points_rules").maybeSingle()
  ]);

  for (const result of [
    drivers, documents, payments, subscriptions, businesses, deliveries, support, rideRequests,
    locations, trips, passengerWithdrawals, driverWithdrawals, reports, auditLogs, ratings, pointsRules
  ]) {
    if (result.error) throw new Error(friendlyBackendMessage(result.error, "Could not load the admin dashboard."));
  }

  const signedDocuments = await Promise.all((documents.data || []).map(async (document: any) => ({
    ...document,
    preview_url: await createSignedStorageUrl("driver-documents", document.file_url)
  })));
  const signedPayments = await Promise.all((payments.data || []).map(async (payment: any) => ({
    ...payment,
    preview_url: await createSignedStorageUrl("driver-payment-proofs", payment.proof_url)
  })));

  return {
    drivers: drivers.data || [],
    documents: signedDocuments,
    payments: signedPayments,
    subscriptions: subscriptions.data || [],
    businesses: businesses.data || [],
    deliveries: deliveries.data || [],
    support: support.data || [],
    rideRequests: rideRequests.data || [],
    locations: locations.data || [],
    trips: trips.data || [],
    passengerWithdrawals: passengerWithdrawals.data || [],
    driverWithdrawals: driverWithdrawals.data || [],
    reports: reports.data || [],
    auditLogs: auditLogs.data || [],
    ratings: ratings.data || [],
    pointsRules: pointsRules.data?.value || null
  };
}

export async function updateDriverStatus(driverId: string, status: "approved" | "rejected" | "suspended" | "pending") {
  const client = requireSupabase();
  const { data: before } = await client.from("drivers").select("id,status").eq("id", driverId).maybeSingle();
  const updates: Record<string, string> = { status };
  if (status === "approved") updates.approved_at = new Date().toISOString();
  const { error } = await client.from("drivers").update(updates).eq("id", driverId);
  if (error) throw new Error("Admin approval failed. Try again.");
  await recordAdminAction({ actionType: `driver_${status}`, targetTable: "drivers", targetId: driverId, beforeData: before, afterData: updates });
}

export async function reviewDriverDocument(params: {
  documentId: string;
  driverId: string;
  adminId: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}) {
  const client = requireSupabase();
  const { error } = await client
    .from("driver_documents")
    .update({
      status: params.status,
      rejection_reason: params.rejectionReason || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: params.adminId
    })
    .eq("id", params.documentId);
  if (error) throw new Error("Admin approval failed. Try again.");

  const { data: docs, error: readError } = await client
    .from("driver_documents")
    .select("document_type,status,rejection_reason")
    .eq("driver_id", params.driverId)
    .eq("is_current", true);
  if (readError) throw new Error(readError.message);

  const required = ["driver_photo", "driver_license", "vehicle_photo", "vehicle_documents"];
  const hasRejected = (docs || []).some((doc) => required.includes(doc.document_type) && doc.status === "rejected");
  const allApproved = required.every((type) => (docs || []).some((doc) => doc.document_type === type && doc.status === "approved"));
  const allUploaded = required.every((type) => (docs || []).some((doc) => doc.document_type === type));
  const documentsStatus = hasRejected ? "rejected" : allApproved ? "approved" : allUploaded ? "pending" : "missing";
  const rejectionReason = hasRejected ? params.rejectionReason || "A required document was rejected." : null;

  const { error: updateError } = await client
    .from("drivers")
    .update({
      documents_status: documentsStatus,
      documents_rejection_reason: rejectionReason,
      documents_approved_at: documentsStatus === "approved" ? new Date().toISOString() : null,
      documents_approved_by: documentsStatus === "approved" ? params.adminId : null
    })
    .eq("id", params.driverId);
  if (updateError) throw new Error(updateError.message);
  await recordAdminAction({
    actionType: `driver_document_${params.status}`,
    targetTable: "driver_documents",
    targetId: params.documentId,
    afterData: { status: params.status, driverId: params.driverId },
    note: params.rejectionReason
  });
}

export async function approveDriverPayment(paymentId: string, adminId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("approve_driver_subscription_payment", { p_payment_id: paymentId, p_admin_id: adminId });
  if (error) throw new Error("Admin approval failed. Try again.");
}

export async function rejectDriverPayment(paymentId: string, reason = "Payment proof rejected by admin.") {
  const client = requireSupabase();
  const { error } = await client.rpc("reject_driver_subscription_payment", { p_payment_id: paymentId, p_reason: reason });
  if (error) throw new Error("Admin approval failed. Try again.");
}

export async function updateBusinessStatus(businessId: string, status: "approved" | "rejected" | "suspended" | "pending") {
  const client = requireSupabase();
  const { data: before } = await client.from("business_accounts").select("id,status").eq("id", businessId).maybeSingle();
  const updates: Record<string, string> = { status };
  if (status === "approved") updates.approved_at = new Date().toISOString();
  const { error } = await client.from("business_accounts").update(updates).eq("id", businessId);
  if (error) throw new Error("Admin approval failed. Try again.");
  await recordAdminAction({ actionType: `business_${status}`, targetTable: "business_accounts", targetId: businessId, beforeData: before, afterData: updates });
}

export async function updateBusinessDeliveryStatus(deliveryId: string, status: string) {
  const client = requireSupabase();
  const { data: before } = await client.from("business_delivery_requests").select("id,status").eq("id", deliveryId).maybeSingle();
  const updates: Record<string, string> = { status };
  if (status === "delivered") updates.delivered_at = new Date().toISOString();
  const { error } = await client.from("business_delivery_requests").update(updates).eq("id", deliveryId);
  if (error) throw new Error("Admin approval failed. Try again.");
  await recordAdminAction({ actionType: `business_delivery_${status}`, targetTable: "business_delivery_requests", targetId: deliveryId, beforeData: before, afterData: updates });
}

export async function updateSupportTicketStatus(ticketId: string, status: string, adminNote?: string) {
  const client = requireSupabase();
  const { data: before } = await client.from("support_tickets").select("id,status,admin_note").eq("id", ticketId).maybeSingle();
  const { error } = await client.from("support_tickets").update({ status, admin_note: adminNote || null }).eq("id", ticketId);
  if (error) throw new Error("Admin approval failed. Try again.");
  await recordAdminAction({ actionType: `support_${status}`, targetTable: "support_tickets", targetId: ticketId, beforeData: before, afterData: { status, adminNote }, note: adminNote });
}

export async function createSupportTicket(params: { userId: string; category: string; message: string }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("support_tickets")
    .insert({
      user_id: params.userId,
      category: params.category,
      message: params.message,
      status: "open"
    })
    .select("*")
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Support ticket could not be created. Try again."));
  return mapSupportTicketRow(data);
}

export async function acceptBusinessDelivery(params: { deliveryId: string; driverId: string }) {
  const client = requireSupabase();
  const { error } = await client.rpc("respond_to_business_delivery", {
    p_delivery_id: params.deliveryId,
    p_driver_id: params.driverId,
    p_offer_type: "accept",
    p_fare_jmd: null
  });
  if (error) throw new Error("Request already accepted by another driver.");
}

export async function fetchRideOffers(rideRequestId: string): Promise<DriverOffer[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("driver_offers")
    .select(
      "id, ride_request_id, offer_type, fare_jmd, status, created_at, drivers(id, user_id, status, documents_status, documents_rejection_reason, vehicle_type, vehicle_make, vehicle_model, vehicle_color, plate_number, profiles:user_id(id, role, full_name, phone,avatar_url))"
    )
    .eq("ride_request_id", rideRequestId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    rideRequestId: row.ride_request_id,
    driver: mapDriverRow(row.drivers),
    offerType: row.offer_type,
    fareJmd: row.fare_jmd,
    status: row.status,
    createdAt: row.created_at
  }));
}

export function subscribeToRideOffers(rideRequestId: string, onChange: (offers: DriverOffer[]) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => {
    void fetchRideOffers(rideRequestId).then(onChange).catch(onError);
  };
  const channel = client
    .channel(`ride-offers:${rideRequestId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "driver_offers", filter: `ride_request_id=eq.${rideRequestId}` },
      refresh
    )
    .subscribe();
  refresh();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function acceptDriverOffer(offerId: string): Promise<TripRecord> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_driver_offer", { p_offer_id: offerId });
  if (error) throw new Error(error.message || "Request already accepted by another driver.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Request already accepted by another driver.");
  return mapTripRow(row);
}

export async function declineDriverOffer(offerId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("decline_driver_offer", { p_offer_id: offerId });
  if (error) throw new Error(friendlyBackendMessage(error, "This driver offer could not be declined."));
  return Array.isArray(data) ? data[0] : data;
}

export async function cancelRideRequest(rideRequestId: string, reason?: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("cancel_ride_request", {
    p_request_id: rideRequestId,
    p_reason: reason || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "This ride request could not be cancelled."));
  return Array.isArray(data) ? data[0] : data;
}

export async function verifyTripPin(params: { tripId: string; pin: string }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("verify_trip_pin", { p_trip_id: params.tripId, p_entered_pin: params.pin });
  if (error) throw new Error(friendlyBackendMessage(error, "Trip PIN could not be checked. Try again."));
  return Boolean(data);
}

export async function updateDriverOnlineStatus(params: { driverId: string; online: boolean; lat?: number; lng?: number; heading?: number | null }) {
  const client = requireSupabase();
  const { data: existing, error: readError } = await client
    .from("driver_locations")
    .select("id")
    .eq("driver_id", params.driverId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const payload = {
    driver_id: params.driverId,
    lat: params.lat ?? 18.1366,
    lng: params.lng ?? -77.031,
    heading: params.heading ?? null,
    is_online: params.online,
    updated_at: new Date().toISOString()
  };

  const result = existing?.id
    ? await client.from("driver_locations").update(payload).eq("id", existing.id)
    : await client.from("driver_locations").insert(payload);
  if (result.error) throw new Error(result.error.message);
}

export function subscribeToPendingRideRequests(driverId: string, onChange: (requests: RideRequest[]) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => {
    void fetchPendingRideRequests(driverId).then(onChange).catch(onError);
  };
  const channel = client
    .channel("pending-ride-requests")
    .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${driverId}` }, refresh)
    .subscribe();
  refresh();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function fetchSearchingBusinessDeliveries(driverId?: string): Promise<BusinessDelivery[]> {
  const client = requireSupabase();
  const [{ data, error }, ignored] = await Promise.all([
    client
    .from("business_delivery_requests")
    .select("*, business_accounts(business_name, business_type)")
    .eq("status", "searching")
    .order("created_at", { ascending: false })
    .limit(10),
    driverId
      ? client.from("business_delivery_ignores").select("delivery_id").eq("driver_id", driverId)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (error) throw new Error(error.message);
  if (ignored.error) throw new Error("Could not refresh ignored deliveries.");
  const ignoredIds = new Set((ignored.data || []).map((row: any) => row.delivery_id));
  return (data || []).filter((row: any) => !ignoredIds.has(row.id)).map(mapBusinessDeliveryRow);
}

export function subscribeToBusinessDeliveries(driverId: string, onChange: (deliveries: BusinessDelivery[]) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => {
    void fetchSearchingBusinessDeliveries(driverId).then(onChange).catch(onError);
  };
  const channel = client
    .channel(`business-delivery-requests:${driverId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_delivery_requests" }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_delivery_ignores", filter: `driver_id=eq.${driverId}` }, refresh)
    .subscribe();
  refresh();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function fetchActiveBusinessDeliveryForDriver(driverId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_delivery_requests")
    .select("*, business_accounts(business_name, business_type)")
    .eq("accepted_driver_id", driverId)
    .in("status", ["accepted", "picking_up", "picked_up", "delivering"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load your active delivery."));
  return data ? mapBusinessDeliveryRow(data) : null;
}

export function subscribeToActiveBusinessDeliveryForDriver(
  driverId: string,
  onChange: (delivery: BusinessDelivery | null) => void,
  onError?: () => void
) {
  const client = requireSupabase();
  const refresh = () => void fetchActiveBusinessDeliveryForDriver(driverId).then(onChange).catch(onError);
  const channel = client
    .channel(`active-business-delivery:${driverId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "business_delivery_requests", filter: `accepted_driver_id=eq.${driverId}` },
      refresh
    )
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function recordAdminAction(params: {
  actionType: string;
  targetTable: string;
  targetId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  note?: string;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("record_admin_audit", {
    p_action_type: params.actionType,
    p_target_table: params.targetTable,
    p_target_id: params.targetId || null,
    p_before_data: params.beforeData || null,
    p_after_data: params.afterData || null,
    p_note: params.note || null
  });
  if (error) throw new Error("The action was saved, but the admin audit log could not be updated.");
}

const ACTIVE_TRIP_STATUSES: TripStatus[] = ["requested", "offered", "accepted", "driver_arriving", "arrived", "in_progress"];

async function fetchSingleActiveTrip(column: "rider_id" | "driver_id", id: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("trips")
    .select("*")
    .eq(column, id)
    .in("status", ACTIVE_TRIP_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load your active trip."));
  return data ? mapTripRow(data) : null;
}

export function fetchActiveTripForRider(riderId: string) {
  return fetchSingleActiveTrip("rider_id", riderId);
}

export function fetchActiveTripForDriver(driverId: string) {
  return fetchSingleActiveTrip("driver_id", driverId);
}

function subscribeToActiveTrip(
  column: "rider_id" | "driver_id",
  id: string,
  onChange: (trip: TripRecord | null) => void,
  onError?: () => void
) {
  const client = requireSupabase();
  const refresh = () => void fetchSingleActiveTrip(column, id).then(onChange).catch(onError);
  const channel = client
    .channel(`active-trip:${column}:${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trips", filter: `${column}=eq.${id}` },
      (payload: any) => {
        if (payload.eventType === "DELETE" || !payload.new?.id) {
          refresh();
          return;
        }
        onChange(mapTripRow(payload.new));
      }
    )
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export function subscribeToActiveTripForRider(riderId: string, onChange: (trip: TripRecord | null) => void, onError?: () => void) {
  return subscribeToActiveTrip("rider_id", riderId, onChange, onError);
}

export function subscribeToActiveTripForDriver(driverId: string, onChange: (trip: TripRecord | null) => void, onError?: () => void) {
  return subscribeToActiveTrip("driver_id", driverId, onChange, onError);
}

export async function fetchTripParticipantProfile(profileId: string): Promise<Profile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,full_name,phone,avatar_url")
    .eq("id", profileId)
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load the trip participant."));
  return {
    id: data.id,
    role: data.role as Role,
    fullName: data.full_name || (data.role === "driver" ? "Driver" : "Passenger"),
    phone: data.phone || "",
    avatarUrl: data.avatar_url || undefined
  };
}

export async function fetchTripMessages(tripId: string): Promise<TripMessage[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("trip_messages")
    .select("id,trip_id,sender_id,body,created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load trip messages."));
  return (data || []).map(mapTripMessageRow);
}

export async function sendTripMessage(params: { tripId: string; senderId: string; body: string }) {
  const client = requireSupabase();
  const body = params.body.trim();
  if (!body) throw new Error("Enter a message first.");
  if (body.length > 1000) throw new Error("Messages can be up to 1,000 characters.");
  const { data, error } = await client
    .from("trip_messages")
    .insert({ trip_id: params.tripId, sender_id: params.senderId, body })
    .select("id,trip_id,sender_id,body,created_at")
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Message could not be sent."));
  return mapTripMessageRow(data);
}

export function subscribeToTripMessages(
  tripId: string,
  onChange: (messages: TripMessage[]) => void,
  onError?: () => void
) {
  const client = requireSupabase();
  const refresh = () => void fetchTripMessages(tripId).then(onChange).catch(onError);
  const channel = client
    .channel(`trip-messages:${tripId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trip_messages", filter: `trip_id=eq.${tripId}` },
      refresh
    )
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function fetchRecentTripCallSignals(tripId: string): Promise<TripCallSignal[]> {
  const client = requireSupabase();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("trip_call_signals")
    .select("id,call_id,trip_id,sender_id,recipient_id,signal_type,payload,created_at")
    .eq("trip_id", tripId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(250);
  if (error) throw new Error(friendlyBackendMessage(error, "Could not connect the audio call."));
  return (data || []).map(mapTripCallSignalRow);
}

export async function sendTripCallSignal(params: {
  callId: string;
  tripId: string;
  senderId: string;
  recipientId: string;
  signalType: TripCallSignalType;
  payload?: Record<string, unknown>;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("trip_call_signals")
    .insert({
      call_id: params.callId,
      trip_id: params.tripId,
      sender_id: params.senderId,
      recipient_id: params.recipientId,
      signal_type: params.signalType,
      payload: params.payload || {}
    })
    .select("id,call_id,trip_id,sender_id,recipient_id,signal_type,payload,created_at")
    .single();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not connect the audio call."));
  return mapTripCallSignalRow(data);
}

export function subscribeToTripCallSignals(
  tripId: string,
  onSignal: (signal: TripCallSignal) => void,
  onError?: () => void
) {
  const client = requireSupabase();
  const delivered = new Set<string>();
  const deliver = (signal: TripCallSignal) => {
    if (delivered.has(signal.id)) return;
    delivered.add(signal.id);
    onSignal(signal);
  };
  const channel = client
    .channel(`trip-call-signals:${tripId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "trip_call_signals", filter: `trip_id=eq.${tripId}` },
      (payload) => deliver(mapTripCallSignalRow(payload.new))
    )
    .subscribe();
  void fetchRecentTripCallSignals(tripId).then((signals) => signals.forEach(deliver)).catch(onError);
  return () => void client.removeChannel(channel);
}

export async function registerPushSubscription(params: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("register_push_subscription", {
    p_endpoint: params.endpoint,
    p_p256dh: params.p256dh,
    p_auth: params.auth,
    p_user_agent: params.userAgent || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Phone alerts could not be enabled."));
  return data as string;
}

export async function unregisterPushSubscription(endpoint: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("unregister_push_subscription", { p_endpoint: endpoint });
  if (error) throw new Error(friendlyBackendMessage(error, "Phone alerts could not be disabled."));
}

export async function fetchTripHistory(params: { riderId?: string; driverId?: string; limit?: number }) {
  const client = requireSupabase();
  let query = client.from("trips").select("*, ride_requests(pickup_name,destination_name,service_type)").order("created_at", { ascending: false }).limit(params.limit || 30);
  if (params.riderId) query = query.eq("rider_id", params.riderId);
  if (params.driverId) query = query.eq("driver_id", params.driverId);
  const { data, error } = await query;
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load trip history."));
  return (data || []).map(mapTripRow);
}

export async function fetchTrip(tripId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from("trips").select("*, ride_requests(pickup_name,destination_name,service_type)").eq("id", tripId).single();
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load this trip."));
  return mapTripRow(data);
}

export function subscribeToTrip(tripId: string, onChange: (trip: TripRecord) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => void fetchTrip(tripId).then(onChange).catch(onError);
  const channel = client
    .channel(`trip:${tripId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, refresh)
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function updateTripStatus(params: { tripId: string; status: TripStatus; reason?: string }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("update_trip_status", {
    p_trip_id: params.tripId,
    p_status: params.status,
    p_reason: params.reason || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Could not update trip. Check your internet."));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not update trip. Check your internet.");
  return mapTripRow(row);
}

export async function uploadTripProofPhoto(params: {
  uploaderId: string;
  file: File;
  tripId?: string;
  businessDeliveryId?: string;
  proofType?: TripProofPhoto["proofType"];
  note?: string;
}) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user || auth.user.id !== params.uploaderId) throw new Error("Your sign-in expired. Sign in again and retry.");
  if (!params.file.type.startsWith("image/")) throw new Error("Choose an image for proof.");
  if (params.file.size > 10 * 1024 * 1024) throw new Error("Proof photo must be smaller than 10 MB.");
  if (!params.tripId && !params.businessDeliveryId) throw new Error("Choose the trip or delivery for this proof.");

  const extension = params.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const folder = params.tripId || `business-${params.businessDeliveryId}`;
  const path = `${folder}/${auth.user.id}/proof-${Date.now()}.${extension}`;
  const upload = await client.storage.from("trip-proof-photos").upload(path, params.file, {
    upsert: false,
    contentType: params.file.type
  });
  if (upload.error) throw new Error("Upload failed. Try again.");

  const { data, error } = await client.from("trip_proof_photos").insert({
    trip_id: params.tripId || null,
    business_delivery_id: params.businessDeliveryId || null,
    uploader_id: auth.user.id,
    storage_path: path,
    proof_type: params.proofType || "handoff",
    note: params.note || null
  }).select("*").single();
  if (error) {
    await client.storage.from("trip-proof-photos").remove([path]);
    throw new Error(friendlyBackendMessage(error, "Proof photo could not be saved. Try again."));
  }
  return {
    id: data.id,
    tripId: data.trip_id,
    businessDeliveryId: data.business_delivery_id,
    uploaderId: data.uploader_id,
    storagePath: data.storage_path,
    signedUrl: await createSignedStorageUrl("trip-proof-photos", data.storage_path) || undefined,
    proofType: data.proof_type,
    note: data.note,
    createdAt: data.created_at
  } as TripProofPhoto;
}

export async function fetchTripProofPhotos(params: { tripId?: string; businessDeliveryId?: string }) {
  const client = requireSupabase();
  let query = client.from("trip_proof_photos").select("*").order("created_at", { ascending: false });
  if (params.tripId) query = query.eq("trip_id", params.tripId);
  if (params.businessDeliveryId) query = query.eq("business_delivery_id", params.businessDeliveryId);
  const { data, error } = await query;
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load proof photos."));
  return Promise.all((data || []).map(async (row: any) => ({
    id: row.id,
    tripId: row.trip_id,
    businessDeliveryId: row.business_delivery_id,
    uploaderId: row.uploader_id,
    storagePath: row.storage_path,
    signedUrl: await createSignedStorageUrl("trip-proof-photos", row.storage_path) || undefined,
    proofType: row.proof_type,
    note: row.note,
    createdAt: row.created_at
  } as TripProofPhoto)));
}

export async function submitTripRating(params: { tripId: string; rating: number; comment?: string; badges?: string[] }) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Sign in before rating this trip.");
  if (params.rating < 1 || params.rating > 5) throw new Error("Choose a rating from 1 to 5 stars.");
  const { data: trip, error: tripError } = await client.from("trips").select("rider_id,driver_id,status").eq("id", params.tripId).single();
  if (tripError || !trip) throw new Error("Could not load this completed trip.");
  if (trip.status !== "completed") throw new Error("Ratings open after the trip is completed.");
  const { data: driver } = await client.from("drivers").select("user_id").eq("id", trip.driver_id).single();
  const reviewedUserId = auth.user.id === trip.rider_id ? driver?.user_id : trip.rider_id;
  if (!reviewedUserId || (auth.user.id !== trip.rider_id && auth.user.id !== driver?.user_id)) throw new Error("You cannot rate this trip.");
  const { data, error } = await client.from("ratings").insert({
    trip_id: params.tripId,
    reviewer_id: auth.user.id,
    reviewed_user_id: reviewedUserId,
    rating: params.rating,
    comment: params.comment || null,
    badges: params.badges || []
  }).select("*").single();
  if (error) throw new Error(friendlyBackendMessage(error, "Your rating could not be saved."));
  return {
    id: data.id,
    tripId: data.trip_id,
    reviewerId: data.reviewer_id,
    reviewedUserId: data.reviewed_user_id,
    rating: data.rating,
    comment: data.comment,
    badges: data.badges || [],
    createdAt: data.created_at
  } as TripRating;
}

export async function createReport(params: {
  reporterId: string;
  reportType: string;
  reason: string;
  details?: string;
  tripId?: string;
  businessDeliveryId?: string;
  reportedUserId?: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.from("reports").insert({
    reporter_id: params.reporterId,
    report_type: params.reportType,
    reason: params.reason,
    details: params.details || null,
    trip_id: params.tripId || null,
    business_delivery_id: params.businessDeliveryId || null,
    reported_user_id: params.reportedUserId || null,
    status: "open"
  }).select("*").single();
  if (error) throw new Error(friendlyBackendMessage(error, "Your report could not be submitted."));
  return {
    id: data.id,
    reporterId: data.reporter_id,
    reportedUserId: data.reported_user_id,
    tripId: data.trip_id,
    businessDeliveryId: data.business_delivery_id,
    reportType: data.report_type,
    reason: data.reason,
    details: data.details,
    status: data.status,
    adminNote: data.admin_note,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as LinRideReport;
}

export async function fetchSupportTickets(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load support tickets."));
  return (data || []).map(mapSupportTicketRow);
}

export function subscribeToSupportTickets(userId: string, onChange: (tickets: SupportTicket[]) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => void fetchSupportTickets(userId).then(onChange).catch(onError);
  const channel = client
    .channel(`support:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${userId}` }, refresh)
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function fetchPointsAccount(userId: string) {
  const client = requireSupabase();
  const ensured = await client.rpc("ensure_points_wallet", { p_user_id: userId });
  if (ensured.error) throw new Error(friendlyBackendMessage(ensured.error, "Could not load your points wallet."));
  const [walletResult, transactionsResult, withdrawalsResult, rulesResult] = await Promise.all([
    client.from("points_wallets").select("*").eq("user_id", userId).single(),
    client.from("points_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    client.from("passenger_withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("platform_settings").select("value").eq("key", "points_rules").maybeSingle()
  ]);
  if (walletResult.error || transactionsResult.error || withdrawalsResult.error) {
    throw new Error("Could not load your points wallet.");
  }
  const walletRow = walletResult.data;
  const wallet: PointsWallet = {
    availablePoints: Number(walletRow.available_points || 0),
    pendingPoints: Number(walletRow.pending_points || 0),
    frozenPoints: Number(walletRow.frozen_points || 0),
    lifetimeEarnedPoints: Number(walletRow.lifetime_earned_points || 0),
    lifetimeWithdrawnPoints: Number(walletRow.lifetime_withdrawn_points || 0)
  };
  const transactions: PointsTransaction[] = (transactionsResult.data || []).map((row: any) => ({
    id: row.id,
    amount: Number(row.amount || 0),
    transactionType: row.transaction_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at
  }));
  const defaultRules: PointsRuleSettings = {
    completedRide: 10,
    completedDelivery: 8,
    completedErrand: 12,
    completedScheduledRide: 15,
    firstCompletedTripBonus: 50,
    referralBonus: 100,
    ratingBonus: 2,
    minimumWithdrawalPoints: 1000,
    pointsToJmdRate: 1
  };
  const rules = { ...defaultRules, ...((rulesResult.data?.value || {}) as Partial<PointsRuleSettings>) };
  return {
    wallet,
    transactions,
    withdrawals: (withdrawalsResult.data || []).map(mapPassengerWithdrawalRow),
    rules
  };
}

export async function requestPassengerWithdrawal(params: {
  points: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_passenger_points_withdrawal", {
    p_points: params.points,
    p_bank_name: params.bankName,
    p_account_name: params.accountName,
    p_account_number: params.accountNumber,
    p_branch: params.branch || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Withdrawal request could not be submitted."));
  return mapPassengerWithdrawalRow(Array.isArray(data) ? data[0] : data);
}

export async function fetchDriverEarnings(driverId: string): Promise<{ summary: DriverEarningsSummary; withdrawals: DriverWithdrawalRequest[] }> {
  const client = requireSupabase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const [earningsResult, walletResult, withdrawalsResult] = await Promise.all([
    client.from("driver_earnings").select("*").eq("driver_id", driverId).order("earned_at", { ascending: false }).limit(100),
    client.from("driver_payout_wallets").select("available_jmd").eq("driver_id", driverId).maybeSingle(),
    client.from("driver_withdrawal_requests").select("*").eq("driver_id", driverId).order("created_at", { ascending: false })
  ]);
  if (earningsResult.error || walletResult.error || withdrawalsResult.error) throw new Error("Could not load driver earnings.");
  const earnings = earningsResult.data || [];
  const week = earnings.filter((row: any) => new Date(row.earned_at) >= weekStart);
  const today = week.filter((row: any) => new Date(row.earned_at) >= todayStart);
  return {
    summary: {
      todayTrips: today.length,
      todayEstimatedJmd: today.reduce((total: number, row: any) => total + Number(row.amount_jmd || 0), 0),
      weekTrips: week.length,
      weekEstimatedJmd: week.reduce((total: number, row: any) => total + Number(row.amount_jmd || 0), 0),
      platformPayoutAvailableJmd: Number(walletResult.data?.available_jmd || 0),
      completedTrips: earnings.slice(0, 20).map((row: any) => ({
        id: row.id,
        amountJmd: Number(row.amount_jmd || 0),
        earningType: row.earning_type,
        earnedAt: row.earned_at
      }))
    },
    withdrawals: (withdrawalsResult.data || []).map(mapDriverWithdrawalRow)
  };
}

export async function requestDriverWithdrawal(params: {
  driverId: string;
  amountJmd: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_driver_withdrawal", {
    p_driver_id: params.driverId,
    p_amount_jmd: params.amountJmd,
    p_bank_name: params.bankName,
    p_account_name: params.accountName,
    p_account_number: params.accountNumber,
    p_branch: params.branch || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Driver withdrawal could not be submitted."));
  return mapDriverWithdrawalRow(Array.isArray(data) ? data[0] : data);
}

export async function counterBusinessDelivery(params: { deliveryId: string; driverId: string; fareJmd: number }) {
  const client = requireSupabase();
  const { error } = await client.rpc("respond_to_business_delivery", {
    p_delivery_id: params.deliveryId,
    p_driver_id: params.driverId,
    p_offer_type: "counter",
    p_fare_jmd: params.fareJmd
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Counter offer could not be sent."));
}

export async function ignoreBusinessDelivery(params: { deliveryId: string; driverId: string; ignoredFareJmd: number }) {
  const client = requireSupabase();
  const { error } = await client.from("business_delivery_ignores").insert({
    delivery_id: params.deliveryId,
    driver_id: params.driverId,
    ignored_fare_jmd: params.ignoredFareJmd
  });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error("Delivery could not be ignored. Try again.");
}

export async function updateBusinessDeliveryProgress(params: { deliveryId: string; status: string; reason?: string }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("update_business_delivery_progress", {
    p_delivery_id: params.deliveryId,
    p_status: params.status,
    p_reason: params.reason || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Could not update delivery. Check your internet."));
  return mapBusinessDeliveryRow(Array.isArray(data) ? data[0] : data);
}

export async function fetchBusinessDeliveryHistory(businessId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_delivery_requests")
    .select("*, business_accounts(business_name,business_type), drivers(id,user_id,status,documents_status,vehicle_type,vehicle_make,vehicle_model,vehicle_color,plate_number,profiles:user_id(id,role,full_name,phone,avatar_url))")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load business deliveries."));
  return (data || []).map(mapBusinessDeliveryRow);
}

export function subscribeToBusinessDeliveryHistory(businessId: string, onChange: (deliveries: BusinessDelivery[]) => void, onError?: () => void) {
  const client = requireSupabase();
  const refresh = () => void fetchBusinessDeliveryHistory(businessId).then(onChange).catch(onError);
  const channel = client
    .channel(`business-history:${businessId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_delivery_requests", filter: `business_id=eq.${businessId}` }, refresh)
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function fetchBusinessDeliveryOffersForBusiness(businessId: string): Promise<BusinessDeliveryOffer[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("business_delivery_offers")
    .select("*, business_delivery_requests!inner(business_id), drivers(id,user_id,status,documents_status,vehicle_type,vehicle_make,vehicle_model,vehicle_color,plate_number,profiles:user_id(id,role,full_name,phone,avatar_url))")
    .eq("business_delivery_requests.business_id", businessId)
    .eq("offer_type", "counter")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlyBackendMessage(error, "Could not load driver counter offers."));
  return (data || []).map((row: any) => ({
    id: row.id,
    deliveryId: row.delivery_id,
    driver: mapDriverRow(row.drivers),
    fareJmd: Number(row.fare_jmd || 0),
    status: row.status,
    createdAt: row.created_at
  }));
}

export function subscribeToBusinessDeliveryOffers(
  businessId: string,
  onChange: (offers: BusinessDeliveryOffer[]) => void,
  onError?: () => void
) {
  const client = requireSupabase();
  const refresh = () => void fetchBusinessDeliveryOffersForBusiness(businessId).then(onChange).catch(onError);
  const channel = client
    .channel(`business-delivery-offers:${businessId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_delivery_offers" }, refresh)
    .subscribe();
  refresh();
  return () => void client.removeChannel(channel);
}

export async function acceptBusinessDeliveryCounterOffer(offerId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_business_delivery_offer", { p_offer_id: offerId });
  if (error) throw new Error(friendlyBackendMessage(error, "This counter offer is no longer available."));
  return mapBusinessDeliveryRow(Array.isArray(data) ? data[0] : data);
}

export async function reviewPassengerWithdrawal(params: { requestId: string; status: "approved" | "rejected" | "paid"; note?: string }) {
  const client = requireSupabase();
  const { error } = await client.rpc("review_passenger_withdrawal", {
    p_request_id: params.requestId,
    p_status: params.status,
    p_note: params.note || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Withdrawal review failed. Try again."));
}

export async function reviewDriverWithdrawal(params: { requestId: string; status: "approved" | "rejected" | "paid"; note?: string }) {
  const client = requireSupabase();
  const { error } = await client.rpc("review_driver_withdrawal", {
    p_request_id: params.requestId,
    p_status: params.status,
    p_note: params.note || null
  });
  if (error) throw new Error(friendlyBackendMessage(error, "Withdrawal review failed. Try again."));
}

export async function updateReportStatus(params: { reportId: string; status: LinRideReport["status"]; adminNote?: string }) {
  const client = requireSupabase();
  const { data: before } = await client.from("reports").select("*").eq("id", params.reportId).maybeSingle();
  const { error } = await client.from("reports").update({ status: params.status, admin_note: params.adminNote || null }).eq("id", params.reportId);
  if (error) throw new Error("Report update failed. Try again.");
  await recordAdminAction({
    actionType: `report_${params.status}`,
    targetTable: "reports",
    targetId: params.reportId,
    beforeData: before,
    afterData: { status: params.status, adminNote: params.adminNote },
    note: params.adminNote
  });
}

export async function updatePointsRules(rules: PointsRuleSettings) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Sign in as an admin to update points rules.");
  const { data: before } = await client.from("platform_settings").select("value").eq("key", "points_rules").maybeSingle();
  const { error } = await client.from("platform_settings").upsert({
    key: "points_rules",
    value: rules,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString()
  });
  if (error) throw new Error("Points rules could not be updated. Try again.");
  await recordAdminAction({
    actionType: "points_rules_updated",
    targetTable: "platform_settings",
    note: "Updated passenger points rules.",
    beforeData: before?.value,
    afterData: rules
  });
}

export function getSignedPrivateFileUrl(bucket: "driver-documents" | "driver-payment-proofs" | "trip-proof-photos", storedValue: string) {
  return createSignedStorageUrl(bucket, storedValue);
}
