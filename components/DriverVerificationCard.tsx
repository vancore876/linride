import { Camera, FileUp, IdCard } from "lucide-react";

export function DriverVerificationCard() {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Driver verification</p>
          <h3 className="text-xl font-black">Admin approval required</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">Complete profile before subscribing or going online.</p>
        </div>
        <IdCard size={25} />
      </div>
      <div className="grid gap-2">
        {["Full name", "Phone number", "Vehicle make/model", "Plate number"].map((label) => (
          <input key={label} className="rounded-2xl border border-black/10 px-4 py-3 text-sm" placeholder={label} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "Driver photo", icon: Camera },
          { label: "Vehicle photo", icon: Camera },
          { label: "License upload", icon: FileUp },
          { label: "Vehicle docs", icon: FileUp }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="flex items-center justify-center gap-2 rounded-2xl bg-smoke px-2 py-3 text-xs font-black"
              type="button"
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
