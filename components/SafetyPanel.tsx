import { Ban, LifeBuoy, PhoneCall, Share2, Siren } from "lucide-react";

export function SafetyPanel() {
  const items = [
    { label: "Report driver", icon: Siren },
    { label: "Report rider", icon: LifeBuoy },
    { label: "Emergency contact", icon: PhoneCall },
    { label: "Share trip", icon: Share2 },
    { label: "Block user", icon: Ban }
  ];

  return (
    <div className="space-y-4 px-4 pt-4">
      <section className="rounded-3xl bg-ink p-5 text-white shadow-lift">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Safety</p>
        <h2 className="mt-1 text-3xl font-black">Support every trip.</h2>
        <p className="mt-3 text-sm leading-6 text-white/66">
          Safety tools are scaffolded for reports, emergency contact, trip sharing, and user blocking.
        </p>
      </section>
      <section className="grid gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left font-black shadow-soft">
              <span className="rounded-2xl bg-linred p-3 text-ink">
                <Icon size={20} />
              </span>
              {item.label}
            </button>
          );
        })}
      </section>
    </div>
  );
}
