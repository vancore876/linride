import { UsersRound } from "lucide-react";

type SharedRidePanelProps = {
  isShared: boolean;
};

export function SharedRidePanel({ isShared }: SharedRidePanelProps) {
  const corridors = ["Linstead to Spanish Town", "Linstead to Kingston", "Linstead to Ewarton", "Linstead to Bog Walk"];

  return (
    <section className="rounded-3xl bg-ink p-4 text-white shadow-lift">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-linred p-3 text-ink">
          <UsersRound size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Route pooling</p>
          <h3 className="text-xl font-black">{isShared ? "Looking for riders going the same direction" : "Private ride selected"}</h3>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {corridors.map((corridor) => (
          <div key={corridor} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/78">
            {corridor}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-white/62">Shared ride suggestion: offer about 15%-25% less when passengers are matched on the same route.</p>
    </section>
  );
}
