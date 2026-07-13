import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const expectedTables = [
  "admin_audit_logs",
  "business_accounts",
  "business_delivery_ignores",
  "business_delivery_offers",
  "business_delivery_requests",
  "driver_documents",
  "driver_earnings",
  "driver_locations",
  "driver_offers",
  "driver_request_ignores",
  "driver_subscription_payments",
  "driver_subscriptions",
  "driver_withdrawal_requests",
  "drivers",
  "errand_requests",
  "fare_zones",
  "local_places",
  "passenger_withdrawal_requests",
  "points_transactions",
  "points_wallets",
  "profiles",
  "ratings",
  "reports",
  "ride_requests",
  "scheduled_rides",
  "shared_ride_groups",
  "shared_ride_members",
  "support_tickets",
  "trip_proof_photos",
  "trips"
];

const expectedFunctions = [
  "accept_business_delivery_offer",
  "accept_driver_offer",
  "approve_driver_subscription_payment",
  "can_driver_receive_requests",
  "can_read_driver_storage",
  "can_read_trip_proof_storage",
  "can_upload_trip_proof_storage",
  "can_view_driver_as_participant",
  "cancel_ride_request",
  "decline_driver_offer",
  "ensure_points_wallet",
  "is_driver_storage_owner",
  "record_admin_audit",
  "register_driver_document",
  "reject_driver_subscription_payment",
  "request_driver_withdrawal",
  "request_passenger_points_withdrawal",
  "respond_to_business_delivery",
  "review_driver_withdrawal",
  "review_passenger_withdrawal",
  "set_driver_location",
  "update_business_delivery_progress",
  "update_trip_status",
  "verify_trip_pin"
];

const expectedRealtime = [
  "business_delivery_offers",
  "business_delivery_requests",
  "driver_locations",
  "driver_offers",
  "ride_requests",
  "support_tickets",
  "trips"
];

const expectedColumns = {
  ride_requests: [
    "bad_road_note",
    "call_when_nearby",
    "cancellation_reason",
    "cancelled_at",
    "destination_landmark",
    "distance_meters",
    "estimated_duration_seconds",
    "extra_stop",
    "fragile_item",
    "heavy_item",
    "pickup_landmark",
    "return_trip",
    "route_geometry",
    "scheduled_time",
    "selected_driver_id"
  ],
  driver_locations: ["accuracy", "heading", "is_available", "is_online", "last_seen_at", "speed"],
  trips: ["arrived_at", "cancellation_reason", "cancelled_at", "driver_arriving_at", "pin_verified", "updated_at"],
  business_delivery_requests: ["accepted_driver_id", "cancellation_reason", "picked_up_at", "updated_at"]
};

const privateBuckets = ["driver-documents", "driver-payment-proofs", "trip-proof-photos"];
const issues = [];
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

function missing(expected, actual) {
  const found = new Set(actual);
  return expected.filter((item) => !found.has(item));
}

try {
  await client.connect();

  const tables = await client.query("select table_name from information_schema.tables where table_schema = 'public' order by table_name");
  const functions = await client.query("select distinct routine_name from information_schema.routines where routine_schema = 'public' order by routine_name");
  const columns = await client.query("select table_name, column_name from information_schema.columns where table_schema = 'public' order by table_name, column_name");
  const realtime = await client.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename");
  const rls = await client.query("select relname as table_name, relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where pg_namespace.nspname = 'public' and pg_class.relkind = 'r'");
  const policies = await client.query("select tablename, count(*)::integer as policy_count from pg_policies where schemaname = 'public' group by tablename");
  const buckets = await client.query("select id, public from storage.buckets order by id");

  const tableNames = tables.rows.map((row) => row.table_name);
  const functionNames = functions.rows.map((row) => row.routine_name);
  const realtimeNames = realtime.rows.map((row) => row.tablename);
  const missingTables = missing(expectedTables, tableNames);
  const missingFunctions = missing(expectedFunctions, functionNames);
  const missingRealtime = missing(expectedRealtime, realtimeNames);
  if (missingTables.length) issues.push(`Missing tables: ${missingTables.join(", ")}`);
  if (missingFunctions.length) issues.push(`Missing functions: ${missingFunctions.join(", ")}`);
  if (missingRealtime.length) issues.push(`Missing realtime tables: ${missingRealtime.join(", ")}`);

  for (const [tableName, required] of Object.entries(expectedColumns)) {
    const actual = columns.rows.filter((row) => row.table_name === tableName).map((row) => row.column_name);
    const absent = missing(required, actual);
    if (absent.length) issues.push(`Missing ${tableName} columns: ${absent.join(", ")}`);
  }

  const rlsLookup = new Map(rls.rows.map((row) => [row.table_name, row.relrowsecurity]));
  const policyLookup = new Map(policies.rows.map((row) => [row.tablename, Number(row.policy_count)]));
  for (const tableName of expectedTables) {
    if (tableNames.includes(tableName) && !rlsLookup.get(tableName)) issues.push(`RLS disabled: ${tableName}`);
    if (tableNames.includes(tableName) && !policyLookup.get(tableName)) issues.push(`No RLS policies: ${tableName}`);
  }

  const bucketLookup = new Map(buckets.rows.map((row) => [row.id, row.public]));
  for (const bucket of privateBuckets) {
    if (!bucketLookup.has(bucket)) issues.push(`Missing storage bucket: ${bucket}`);
    else if (bucketLookup.get(bucket)) issues.push(`Private storage bucket is public: ${bucket}`);
  }
  if (!bucketLookup.has("profile-photos")) issues.push("Missing storage bucket: profile-photos");

  console.log("CONNECTED");
  console.log(`TABLES=${expectedTables.length - missingTables.length}/${expectedTables.length}`);
  console.log(`FUNCTIONS=${expectedFunctions.length - missingFunctions.length}/${expectedFunctions.length}`);
  console.log(`REALTIME=${expectedRealtime.length - missingRealtime.length}/${expectedRealtime.length}`);
  console.log(`PRIVATE_BUCKETS=${privateBuckets.filter((bucket) => bucketLookup.has(bucket) && !bucketLookup.get(bucket)).length}/${privateBuckets.length}`);
  console.log(`RLS_TABLES=${expectedTables.filter((table) => rlsLookup.get(table)).length}/${expectedTables.length}`);

  if (issues.length) {
    console.error("AUDIT_FAILED");
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
  } else {
    console.log("AUDIT_OK");
  }
} catch (error) {
  console.error("CONNECTION_FAILED:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
