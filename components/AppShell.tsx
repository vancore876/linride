import { ArrowUpRight, BriefcaseBusiness, CarFront, House, LogOut, Moon, ShieldCheck, Sun, Video, Waves, MapPinned } from "lucide-react";
import { JourneyProgress, JourneyProgressData } from "@/components/JourneyProgress";
import { LINRIDE_TIKTOK } from "@/lib/social";

export type AppView = "rider" | "driver" | "business" | "admin";
export type ThemeMode = "dark" | "light";

type AppShellProps = {
  currentView: AppView;
  children: React.ReactNode;
  onChangeView: (view: AppView) => void;
  onBackHome: () => void;
  allowAdmin?: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  journey?: JourneyProgressData;
};

const sections = [
  { view: "rider", label: "Explore", subtitle: "Book a journey", icon: House },
  { view: "driver", label: "Drive", subtitle: "Find nearby jobs", icon: CarFront },
  { view: "business", label: "Business", subtitle: "Send a delivery", icon: BriefcaseBusiness },
  { view: "admin", label: "Control room", subtitle: "Manage LinRide", icon: ShieldCheck }
] as const;

const pageTitle: Record<AppView, { title: string; kicker: string; description: string }> = {
  rider: { title: "Your next journey", kicker: "PASSENGER EXPERIENCE", description: "Where Jamaica moves together." },
  driver: { title: "Driver hub", kicker: "YOUR WORKSPACE", description: "See what is happening around you." },
  business: { title: "Business dispatch", kicker: "DELIVERIES MADE SIMPLE", description: "Move goods across your community." },
  admin: { title: "Operations center", kicker: "LINRIDE CONTROL", description: "Keep your platform running smoothly." }
};

export function AppShell({
  currentView, children, onChangeView, onBackHome,
  allowAdmin = false, theme, onToggleTheme, journey
}: AppShellProps) {
  const current = pageTitle[currentView];
  const visible = sections.filter((section) => section.view !== "admin" || allowAdmin);
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <main data-theme={theme} className="linride-app-bg lr2-app min-h-screen text-charcoal">
      <div className="lr2-frame">
        <aside className="lr2-sidebar" aria-label="Main navigation">
          <div className="lr2-brand">
            <span className="lr2-brand-mark"><Waves size={26} strokeWidth={2.6} /></span>
            <div><strong>lin<span>ride.</span></strong><small>Move your way.</small></div>
          </div>
          <span className="lr2-sidebar-caption">YOUR SPACE</span>
          <nav className="lr2-role-nav" aria-label="Choose a LinRide section">
            {visible.map((section) => {
              const Icon = section.icon;
              const active = currentView === section.view;
              return (
                <button
                  key={section.view}
                  type="button"
                  onClick={() => onChangeView(section.view)}
                  className={`lr2-nav-item ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="lr2-nav-icon"><Icon size={21} strokeWidth={2.15} /></span>
                  <span className="lr2-nav-copy"><strong>{section.label}</strong><small>{section.subtitle}</small></span>
                  {active && <span className="lr2-nav-active-dot" />}
                </button>
              );
            })}
          </nav>
          <div className="lr2-sidebar-bottom">
            <div className="lr2-sidebar-story">
              <MapPinned size={21} />
              <strong>Born in Jamaica.</strong>
              <span>Built for the journeys that matter to us.</span>
            </div>
            <a href={LINRIDE_TIKTOK.url} className="lr2-side-action" target="_blank" rel="noreferrer">
              <Video size={18} /> Our community <ArrowUpRight size={16} />
            </a>
            <button type="button" className="lr2-side-action" onClick={onToggleTheme}><ThemeIcon size={18} /> {theme === "dark" ? "Light appearance" : "Dark appearance"}</button>
            <button type="button" className="lr2-side-action" onClick={onBackHome}><LogOut size={18} /> Sign out</button>
          </div>
        </aside>

        <section className="lr2-workspace">
          <header className="lr2-header">
            <div className="lr2-header-title">
              <span className="lr2-kicker">{current.kicker}</span>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
            </div>
            <div className="lr2-header-actions">
              <span className="lr2-jamaica-chip"><span className="lr2-pulse-dot" /> Made for Jamaica</span>
              <button type="button" onClick={onToggleTheme} className="lr2-icon-action" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}><ThemeIcon size={19} /></button>
              <button type="button" onClick={onBackHome} className="lr2-icon-action lr2-desktop-signout" aria-label="Sign out"><LogOut size={19} /></button>
            </div>
          </header>
          <div className="lr2-content">
            {journey && <div className="lr2-journey"><JourneyProgress data={journey} /></div>}
            {children}
          </div>
        </section>
      </div>
      <nav className="lr2-mobile-dock" aria-label="Mobile navigation">
        {visible.map((section) => {
          const Icon = section.icon;
          const active = currentView === section.view;
          return (
            <button type="button" key={section.view} onClick={() => onChangeView(section.view)} aria-current={active ? "page" : undefined} className={`lr2-dock-item ${active ? "is-active" : ""}`}>
              <Icon size={22} strokeWidth={active ? 2.7 : 2} /><span>{section.label}</span>
            </button>
          );
        })}
        <button type="button" onClick={onBackHome} className="lr2-dock-item"><LogOut size={21} /><span>Exit</span></button>
      </nav>
    </main>
  );
}
