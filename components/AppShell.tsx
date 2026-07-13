import { BriefcaseBusiness, Car, LogOut, Moon, ShieldCheck, Sun, UserRound, Wifi } from "lucide-react";
import { JourneyProgress, JourneyProgressData } from "@/components/JourneyProgress";

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

export function AppShell({
  currentView,
  children,
  onChangeView,
  onBackHome,
  allowAdmin = false,
  theme,
  onToggleTheme,
  journey
}: AppShellProps) {
  const title = {
    rider: "Passenger",
    driver: "Driver / Rider",
    business: "Business",
    admin: "Admin"
  }[currentView];
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const tabs: Array<{ view: AppView; label: string; icon: typeof UserRound; show: boolean }> = [
    { view: "rider", label: "Passenger", icon: UserRound, show: true },
    { view: "driver", label: "Driver / Rider", icon: Car, show: true },
    { view: "business", label: "Business", icon: BriefcaseBusiness, show: true },
    { view: "admin", label: "Admin", icon: ShieldCheck, show: allowAdmin }
  ];

  return (
    <main data-theme={theme} className="linride-app-bg min-h-screen text-charcoal transition-colors">
      <div className="app-frame">
        <aside className="app-sidebar">
          <div className="app-brand">
            <div className="linride-logo-pill" role="img" aria-label="LinRide"><span className="sr-only">LinRide</span></div>
          </div>
          <nav className="app-role-nav" aria-label="Lin Ride screens">
          {tabs.filter((tab) => tab.show).map((tab) => {
            const Icon = tab.icon;
            const active = tab.view === currentView;

            return (
              <button
                key={tab.view}
                type="button"
                onClick={() => onChangeView(tab.view)}
                className={`app-role-link ${active ? "app-role-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                {tab.label}
              </button>
            );
          })}
          </nav>
          <div className="app-sidebar-footer">
            <button type="button" onClick={onToggleTheme} className="app-role-link" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              <ThemeIcon size={19} /> {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" onClick={onBackHome} className="app-role-link"><LogOut size={19} /> Sign out</button>
          </div>
        </aside>

        <section className="app-workspace">
          <header className="app-workspace-header">
            <div><span className="app-page-kicker">Lin Ride workspace</span><h1>{title}</h1></div>
            <div className="app-header-actions">
              <div className="app-online-chip"><Wifi size={15} /> Online <span /> Jamaica</div>
              <div className="app-mobile-actions">
                <button type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><ThemeIcon size={18} /></button>
                <button type="button" onClick={onBackHome} aria-label="Sign out"><LogOut size={18} /></button>
              </div>
            </div>
          </header>
          <div className="app-scrollbar app-content">
            {journey && <JourneyProgress data={journey} />}
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
