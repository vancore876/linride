import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const email = process.argv[2]?.trim().toLowerCase();
if (!connectionString || !email) {
  console.error("Usage: DATABASE_URL=... node scripts/promote-admin.mjs person@example.com");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  const result = await client.query(
    `update public.profiles p
     set role = 'admin'
     from auth.users u
     where p.id = u.id and lower(u.email) = $1
     returning p.id`,
    [email]
  );
  if (result.rowCount !== 1) throw new Error("Sign up that email in Lin Ride before promoting it.");
  console.log(`Promoted ${email} to Lin Ride admin.`);
} catch (error) {
  console.error("PROMOTION_FAILED:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
