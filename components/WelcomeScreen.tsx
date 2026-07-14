import { ArrowLeft, BriefcaseBusiness, Car, CheckCircle2, MapPinned, Moon, Sun, UserRound, Video } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { LINRIDE_TIKTOK } from "@/lib/social";
import { Role } from "@/types/linride";

type AuthMode = "signup" | "signin";

type AuthOptions = {
  authMode: AuthMode;
  email: string;
  password: string;
  fullName: string;
  phone: string;
};

type WelcomeScreenProps = {
  onChooseRole: (role: Role, options: AuthOptions) => Promise<void>;
  onGoogleSignIn: (role: Exclude<Role, "admin">, options: Pick<AuthOptions, "authMode" | "fullName" | "phone">) => Promise<void>;
  message?: string | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

const signupRoles: Array<{ label: string; value: Exclude<Role, "admin"> }> = [
  { label: "Passenger", value: "rider" },
  { label: "Driver / Rider", value: "driver" },
  { label: "Business user", value: "business" }
];

export function WelcomeScreen({ onChooseRole, onGoogleSignIn, message, theme, onToggleTheme }: WelcomeScreenProps) {
  const [screen, setScreen] = useState<"home" | AuthMode>("home");
  const [signupRole, setSignupRole] = useState<Exclude<Role, "admin">>("rider");
  const [signinRole, setSigninRole] = useState<Exclude<Role, "admin">>("rider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "google" | null>(null);
  const authBusyRef = useRef(false);

  const activeRole = screen === "signin" ? signinRole : signupRole;
  const isDark = theme === "dark";
  const ThemeIcon = isDark ? Sun : Moon;
  const actionCopy = useMemo(() => {
    if (screen === "signup") {
      return {
        eyebrow: "Create your Lin Ride account",
        title: "Sign up",
        body: "Choose what you are signing up for so Lin Ride can open the right dashboard.",
        button: "Create account"
      };
    }
    return {
      eyebrow: "Welcome back",
      title: "Sign in",
      body: "Choose the account type you are signing in with to open the right Lin Ride workspace.",
      button: "Sign in"
    };
  }, [screen]);

  async function runAuth(method: "password" | "google", action: () => Promise<void>) {
    if (authBusyRef.current) return;
    authBusyRef.current = true;
    setAuthBusy(true);
    setAuthMethod(method);
    try {
      await action();
    } finally {
      authBusyRef.current = false;
      setAuthBusy(false);
      setAuthMethod(null);
    }
  }

  async function submitAuth() {
    if (screen === "home") return;
    await runAuth("password", () => onChooseRole(activeRole, {
        authMode: screen,
        email,
        password,
        fullName,
        phone
      }));
  }

  async function submitGoogle() {
    if (screen === "home") return;
    await runAuth("google", () => onGoogleSignIn(activeRole, {
      authMode: screen,
      fullName,
      phone
    }));
  }

  if (screen !== "home") {
    const roleOptions = signupRoles;

    return (
      <main data-theme={theme} className="linride-app-bg min-h-screen text-charcoal transition-colors">
        <section className="linride-wrap grid min-h-screen gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="linride-card-dark">
            <div className="mb-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setScreen("home")}
                disabled={authBusy}
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-black text-white/80 disabled:cursor-wait disabled:opacity-60"
              >
                <ArrowLeft size={17} />
                Back
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center gap-2 rounded-full bg-[rgb(255_255_255)] px-4 py-2 text-sm font-black text-ink"
                aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
              >
                <ThemeIcon size={16} />
                {isDark ? "Light" : "Dark"}
              </button>
            </div>
            <div className="linride-logo-pill linride-auth-logo" role="img" aria-label="LinRide">
              <span className="sr-only">LinRide</span>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-linred">{actionCopy.eyebrow}</p>
            <h1 className="mt-3 text-5xl font-black leading-none">{actionCopy.title}</h1>
            <p className="mt-4 max-w-md text-base font-semibold leading-7 text-white/70">{actionCopy.body}</p>
            <div className="mt-8 grid gap-3 text-sm font-bold text-white/76">
              <p className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-linred" />
                Passenger rides, errands, delivery, shopping pickup, and moving help
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-linred" />
                Driver/rider request feed, offers, earnings, and bank withdrawals
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-linred" />
                Business delivery tools with cash collection support
              </p>
            </div>
          </div>

          <form
            className="linride-card"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuth();
            }}
          >
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Lin Ride Web App</p>
              <h2 className="mt-1 text-3xl font-black">{actionCopy.title}</h2>
              <p className="mt-2 text-sm font-semibold text-charcoal/58">
                Use one account to reach the dashboard that matches your role.
              </p>
            </div>

            <label className="block text-sm font-black">
              {screen === "signup" ? "What are you signing up for?" : "What are you signing in as?"}
              <select
                value={activeRole}
                disabled={authBusy}
                onChange={(event) => {
                  const role = event.target.value as Exclude<Role, "admin">;
                  if (screen === "signin") setSigninRole(role);
                  else setSignupRole(role);
                }}
                className="linride-select mt-2"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            {screen === "signup" && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={fullName}
                  disabled={authBusy}
                  onChange={(event) => setFullName(event.target.value)}
                  className="linride-input"
                  placeholder={signupRole === "business" ? "Business name" : "Full name"}
                  autoComplete="name"
                  required
                />
                <input
                  value={phone}
                  disabled={authBusy}
                  onChange={(event) => setPhone(event.target.value)}
                  className="linride-input"
                  placeholder={signupRole === "driver" ? "Real phone number" : "876-000-0000"}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </div>
            )}

            {screen === "signup" && signupRole === "driver" && (
              <p className="mt-2 rounded-2xl bg-linred/10 px-3 py-2 text-xs font-bold leading-5 text-linred">
                Use your real phone number. Passengers can see it after you accept their ride.
              </p>
            )}

            <button
              type="button"
              onClick={() => void submitGoogle()}
              disabled={authBusy}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-charcoal/15 bg-white px-5 py-4 text-sm font-black text-ink shadow-sm transition hover:border-charcoal/30 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/10 bg-white text-base font-black text-[#4285f4]" aria-hidden="true">
                G
              </span>
              {authBusy && authMethod === "google"
                ? "Connecting to Google..."
                : screen === "signup"
                  ? "Sign up with Google"
                  : "Continue with Google"}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs font-black uppercase text-charcoal/40">
              <span className="h-px flex-1 bg-charcoal/10" />
              Or use email
              <span className="h-px flex-1 bg-charcoal/10" />
            </div>

            {screen === "signup" && (
              <p className="mb-4 rounded-lg bg-linred/10 px-3 py-2 text-xs font-bold leading-5 text-linred">
                Email signup opens your account here. No verification email is required.
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={email}
                disabled={authBusy}
                onChange={(event) => setEmail(event.target.value)}
                className="linride-input"
                placeholder="name@email.com"
                type="email"
                autoComplete="email"
                required
              />
              <input
                value={password}
                disabled={authBusy}
                onChange={(event) => setPassword(event.target.value)}
                className="linride-input"
                placeholder="Password"
                type="password"
                autoComplete={screen === "signup" ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </div>

            {message && <p className="mt-4 rounded-2xl bg-linred/10 px-3 py-3 text-sm font-bold text-linred">{message}</p>}

            <button type="submit" disabled={authBusy} className="linride-submit mt-5 disabled:cursor-wait disabled:opacity-60">
              {authBusy && authMethod === "password"
                ? (screen === "signup" ? "Creating account..." : "Signing in...")
                : actionCopy.button}
            </button>

            <button
              type="button"
              onClick={() => setScreen(screen === "signup" ? "signin" : "signup")}
              disabled={authBusy}
              className="mt-3 w-full rounded-2xl bg-smoke px-5 py-4 text-sm font-black text-charcoal disabled:cursor-wait disabled:opacity-60"
            >
              {screen === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main data-theme={theme} className="linride-app-bg min-h-screen text-charcoal transition-colors">
      <div className="linride-wrap">
        <div className="linride-top-row">
          <div className="linride-logo-pill" role="img" aria-label="LinRide">
            <span className="sr-only">LinRide</span>
          </div>
          <div className="linride-top-actions">
            <div className="linride-chip">Web App</div>
            <div className="linride-chip">Jamaica</div>
            <a
              href={LINRIDE_TIKTOK.url}
              target="_blank"
              rel="noreferrer"
              className="linride-chip"
              aria-label={`Open Lin Ride on TikTok ${LINRIDE_TIKTOK.handle}`}
            >
              <Video size={15} /> TikTok {LINRIDE_TIKTOK.handle}
            </a>
            <button
              type="button"
              onClick={onToggleTheme}
              className="linride-chip"
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            >
              <ThemeIcon size={15} />
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <section className="linride-hero">
          <div>
            <p className="linride-eyebrow">Built for country areas in Jamaica</p>
            <h1 className="linride-headline">
              Book rides and deliveries <span className="linride-headline-accent">the simple way.</span>
            </h1>
            <p className="linride-sub">
              Enter where you are going, choose a fair price, and let nearby drivers or riders respond.
            </p>
            <div className="linride-cta-row">
              <button type="button" onClick={() => setScreen("signup")} className="linride-cta linride-cta-primary">
                <span className="linride-cta-title">Create account</span>
                <span className="linride-cta-copy block">Passenger, driver/rider, or business</span>
              </button>
              <button type="button" onClick={() => setScreen("signin")} className="linride-cta linride-cta-secondary">
                <span className="linride-cta-title">Sign in</span>
                <span className="linride-cta-copy block">Access your dashboard</span>
              </button>
            </div>
          </div>

          <div className="linride-stat-grid">
            {[
              ["J$2,000", "Weekly driver pass"],
              ["Live", "Driver GPS"],
              ["JM", "Jamaica locations"]
            ].map(([value, label]) => (
              <div key={label} className="linride-stat-box">
                <div className="linride-stat-num">{value}</div>
                <div className="linride-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="linride-panel-grid">
          {[
            { icon: UserRound, title: "Passenger", body: "Book a ride, delivery, errand, shopping pickup, school run, or moving help." },
            { icon: Car, title: "Driver / Rider", body: "Go online, see nearby jobs, accept fares, send counters, and track earnings." },
            { icon: BriefcaseBusiness, title: "Business", body: "Create deliveries for customers with cash collection and pickup notes." }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="linride-card">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-2xl bg-linred p-3 text-ink">
                    <Icon size={20} />
                  </span>
                  <h2 className="text-xl font-black">{item.title}</h2>
                </div>
                <p className="text-sm font-semibold leading-6 text-charcoal/64">{item.body}</p>
              </article>
            );
          })}
          <div className="linride-note-bar md:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-linred">
              <MapPinned size={18} />
              Jamaica country-area ready
            </div>
            <p className="text-sm font-bold leading-6 text-charcoal/64">
              Add landmarks and notes when needed. Keep it simple when you just need a ride.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
