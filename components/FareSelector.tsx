import { Banknote } from "lucide-react";

type FareSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export function FareSelector({ value, onChange }: FareSelectorProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Name your fare</p>
          <h3 className="text-xl font-black">${value.toLocaleString()} JMD</h3>
        </div>
        <Banknote className="text-charcoal" size={24} />
      </div>
      <input
        aria-label="Offered fare"
        type="range"
        min={500}
        max={8000}
        step={50}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-linred"
      />
      <div className="mt-2 flex justify-between text-xs font-semibold text-charcoal/55">
        <span>Suggested: $800-$1,200</span>
        <span>Pay driver directly</span>
      </div>
    </section>
  );
}
