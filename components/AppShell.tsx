"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, CarFront, House, LogOut, Moon, ShieldCheck, Sun, Video, Waves, MapPinned, Menu, X, ChevronRight, UserRound, Bell, LocateFixed, MapPin, Navigation } from "lucide-react";
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
  accountName?: string;
  accountTools?: React.ReactNode;
  notificationTools?: React.ReactNode;
  gpsTools?: React.ReactNode;
  gpsNeedsConfirmation?: boolean;
  onUseCurrentLocation?: () => void;
  onSetPickupPin?: () => void;
  onViewMap?: () => void;
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
  allowAdmin = false, theme, onToggleTheme, journey,
  accountName, accountTools, notificationTools, gpsTools, gpsNeedsConfirmation = false, onUseCurrentLocation, onSetPickupPin, onViewMap
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => { setDrawerOpen(false); }, [currentView]);
  useEffect(() => { if (gpsNeedsConfirmation && currentView === "rider") setDrawerOpen(true); }, [gpsNeedsConfirmation, currentView]);
  useEffect(() => { if (!drawerOpen) return; const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); }; document.addEventListener("keydown", handleKey); return () => document.removeEventListener("keydown", handleKey); }, [drawerOpen]);
  const current = pageTitle[currentView];
  const visible = sections.filter((section) => section.view !== "admin" || allowAdmin);
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <main data-theme={theme} className="linride-app-bg lr2-app min-h-screen text-charcoal">
      {drawerOpen && <button type="button" className="lr3-drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <div className="lr2-frame">
        <aside className={`lr2-sidebar ${drawerOpen ? "lr3-drawer-open" : ""}`} aria-label="Main navigation">
          <div className="lr2-brand">
            <span className="lr2-brand-mark"><Waves size={26} strokeWidth={2.6} /></span>
            <div><strong>lin<span>ride.</span></strong><small>Move your way.</small></div>
          </div>
          <button type="button" className="lr3-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22}/></button>
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
          <div className="lr4-sidebar-extras">
            <span className="lr2-sidebar-caption">YOUR ACCOUNT</span>
            {accountName && <div className="lr4-account-summary"><span className="lr4-account-avatar"><UserRound size={20} /></span><div><strong>{accountName}</strong><small>Your LinRide profile</small></div></div>}
            {accountTools && <details className="lr4-sidebar-details"><summary><UserRound size={18} /> Profile picture <ChevronRight size={17} /></summary><div className="lr4-sidebar-tools">{accountTools}</div></details>}
            {notificationTools && <details className="lr4-sidebar-details"><summary><Bell size={18} /> Phone alerts <ChevronRight size={17} /></summary><div className="lr4-sidebar-tools">{notificationTools}</div></details>}
            {currentView === "rider" && gpsTools && (
              <details className="lr4-sidebar-details" open={gpsNeedsConfirmation ? true : undefined}>
                <summary><LocateFixed size={18} /> Location &amp; accuracy {gpsNeedsConfirmation && <span className="lr6-gps-attention">Review</span>} <ChevronRight size={17} /></summary>
                <div className="lr4-sidebar-tools">{gpsTools}</div>
              </details>
            )}
            {currentView === "rider" && <div id="lr7-rider-sidebar-host" className="lr7-sidebar-host" aria-label="More rider tools" />}
            {currentView === "rider" && (onUseCurrentLocation || onSetPickupPin || onViewMap) && (
              <div className="lr4-sidebar-map-actions">
                <span className="lr2-sidebar-caption">QUICK ROUTE ACTIONS</span>
                {onSetPickupPin && <button type="button" onClick={() => { setDrawerOpen(false); onSetPickupPin(); }}><MapPin size={18} /> Set pickup pin</button>}
                {onViewMap && <button type="button" onClick={() => { setDrawerOpen(false); onViewMap(); }}><Navigation size={18} /> View trip map</button>}
              </div>
            )}
          </div>
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
            <button type="button" className="lr3-menu-toggle" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu size={22}/></button>
            <div className="lr2-header-title">
              <span className="lr2-kicker">{current.kicker}</span>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
            </div>
            <div className="lr2-header-actions">
              <button type="button" className="lr3-menu-shortcut" onClick={() => setDrawerOpen(true)}>Menu <ChevronRight size={16}/></button>
              <span className="lr2-jamaica-chip"><span className="lr2-pulse-dot" /> Made for Jamaica</span>
              <button type="button" onClick={onToggleTheme} className="lr2-icon-action" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}><ThemeIcon size={19} /></button>
              <button type="button" onClick={onBackHome} className="lr2-icon-action lr2-desktop-signout" aria-label="Sign out"><LogOut size={19} /></button>
            </div>
          </header>
          <div className="lr2-content">
            {journey && currentView !== "rider" && <div className="lr2-journey"><JourneyProgress data={journey} /></div>}
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
