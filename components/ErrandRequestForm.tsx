import { ShoppingBag } from "lucide-react";

export function ErrandRequestForm() {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Errand / Pickup</p>
          <h3 className="text-xl font-black">Food, pharmacy, packages</h3>
        </div>
        <ShoppingBag size={23} />
      </div>
      <div className="grid gap-2">
        {["Item description", "Estimated item cost", "Rider offer for delivery", "Notes"].map((label) => (
          <input key={label} className="rounded-2xl border border-black/10 px-4 py-3 text-sm" placeholder={label} />
        ))}
      </div>
      <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-xs font-bold text-linred">
        Do not request illegal, unsafe, or restricted items.
      </p>
    </section>
  );
}
