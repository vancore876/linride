import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RateRecord = { count: number; resetAt: number };

const attempts = new Map<string, RateRecord>();
const globalDatabase = globalThis as typeof globalThis & { linRideAuthPool?: Pool };

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!globalDatabase.linRideAuthPool) {
    globalDatabase.linRideAuthPool = new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false }
    });
  }
  return globalDatabase.linRideAuthPool;
}

function isRateLimited(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.ip || "local";
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }

  current.count += 1;
  return current.count > 8;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || email.length > 254 || !email.includes("@") || password.length < 6 || password.length > 512) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const result = await database().query<{ id: string }>(
      `update auth.users
       set email_confirmed_at = coalesce(email_confirmed_at, now()),
           confirmation_token = '',
           updated_at = now()
       where lower(email) = $1
         and encrypted_password is not null
         and encrypted_password <> ''
         and encrypted_password = extensions.crypt($2, encrypted_password)
       returning id`,
      [email, password]
    );

    if (result.rowCount !== 1) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    return NextResponse.json({ confirmed: true });
  } catch (error) {
    console.error("Could not complete password signup", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Email signup is temporarily unavailable. Use Google or try again shortly." },
      { status: 503 }
    );
  }
}
