import { Clock3, Gauge, RefreshCw, WalletCards } from "lucide-react";
import { Place, RouteDetails } from "@/types/linride";

type RouteSummaryCardProps = {
  pickup: Place;
  destination: Place;
  route: RouteDetails | null;
  loading: boolean;
  error?: string | null;
  fareJmd: number;
  onRefresh: () => void;
};

export function RouteSummaryCard({ pickup, destination, route, loading, error, fareJmd, onRefresh }: RouteSummaryCardProps) {
  return (
    <section className="map-route-summary" aria-live="polite">
      <div className="map-route-summary-head">
        <div><span>Trip summary</span><strong>{pickup.name} to {destination.name}</strong></div>
        <button type="button" onClick={onRefresh} aria-label="Refresh route"><RefreshCw size={17} /></button>
      </div>
      {loading && <p className="map-route-message">Calculating the best driving route...</p>}
      {error && <p className="map-route-message map-route-error">{error}</p>}
      {!loading && !error && route && (
        <div className="map-route-metrics">
          <span><Gauge size={18} /><b>{(route.distanceMeters / 1000).toFixed(1)} km</b><small>Road distance</small></span>
          <span><Clock3 size={18} /><b>{Math.max(1, Math.round(route.durationSeconds / 60))} min</b><small>Estimated time</small></span>
          <span><WalletCards size={18} /><b>J${fareJmd.toLocaleString()}</b><small>Your offer</small></span>
        </div>
      )}
      {!loading && !error && !route && <p className="map-route-message">Choose a confirmed pickup and destination to see the route.</p>}
      <p className="map-route-address"><b>Pickup:</b> {pickup.name}</p>
      <p className="map-route-address"><b>Destination:</b> {destination.name}</p>
    </section>
  );
}
