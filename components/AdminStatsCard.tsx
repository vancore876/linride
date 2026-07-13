type AdminStatsCardProps = {
  label: string;
  value: string | number;
};

export function AdminStatsCard({ label, value }: AdminStatsCardProps) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-charcoal/55">{label}</p>
    </div>
  );
}
