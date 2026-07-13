"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { signInAdmin } from "@/lib/backend";

export function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage("Enter the administrator email and password.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await signInAdmin({ email: email.trim(), password });
      router.replace("/?admin=control");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Administrator sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main data-theme="dark" className="linride-app-bg min-h-screen text-charcoal">
      <section className="linride-wrap grid min-h-screen gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="linride-card-dark">
          <a href="/" className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-black text-white/80">
            <ArrowLeft size={17} />
            Lin Ride home
          </a>
          <div className="linride-logo-pill linride-auth-logo" role="img" aria-label="LinRide">
            <span className="sr-only">LinRide</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-linred">Restricted access</p>
          <h1 className="mt-3 text-5xl font-black leading-none">Control room</h1>
          <p className="mt-4 max-w-md text-base font-semibold leading-7 text-white/70">
            This private workspace is available only to approved Lin Ride administrator accounts.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/75">
            <ShieldCheck size={22} className="shrink-0 text-linred" />
            Account permissions are checked before the dashboard opens.
          </div>
        </div>

        <form className="linride-card" onSubmit={submitAdminLogin}>
          <div className="mb-6 flex items-start gap-3">
            <span className="rounded-lg bg-linred p-3 text-ink">
              <LockKeyhole size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Administrator</p>
              <h2 className="mt-1 text-3xl font-black">Secure sign in</h2>
            </div>
          </div>

          <label className="block text-sm font-black">
            Admin email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="linride-input mt-2"
              placeholder="admin@example.com"
              autoComplete="username"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-black">
            Password
            <span className="relative mt-2 block">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="linride-input pr-12"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal/60"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>

          {message && (
            <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700" role="alert">
              {message}
            </p>
          )}

          <button type="submit" disabled={busy} className="linride-cta linride-cta-primary mt-6 w-full disabled:cursor-wait disabled:opacity-60">
            <span className="linride-cta-title">{busy ? "Checking account..." : "Open control room"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
