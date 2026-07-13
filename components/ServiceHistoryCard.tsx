import { Clock3, Star } from "lucide-react";

type ServiceHistoryItem = {
  id: string;
  serviceType: string;
  route: string;
  status: string;
  fareJmd: number;
  points: number;
};

type ServiceHistoryCardProps = {
  history: ServiceHistoryItem[];
};

export function ServiceHistoryCard({ history }: ServiceHistoryCardProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-2xl bg-linred/10 p-3 text-linred">
          <Clock3 size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">History</p>
          <h3 className="text-xl font-black">Trips, orders, and errands</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">Completed activity earns points after review rules pass.</p>
        </div>
      </div>

      <div className="space-y-2">
        {history.length === 0 && (
          <p className="rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/60">
            No completed jobs yet. Your rides, deliveries, errands, and scheduled jobs will appear here.
          </p>
        )}
        {history.map((item) => (
          <article key={item.id} className="rounded-2xl bg-smoke px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{item.serviceType}</p>
                <p className="mt-1 text-xs font-bold text-charcoal/55">{item.route}</p>
                <p className="mt-1 text-xs font-bold text-charcoal/45">
                  {item.status} - ${item.fareJmd.toLocaleString()} JMD
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-linred">
                <Star size={12} />
                {item.points}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
