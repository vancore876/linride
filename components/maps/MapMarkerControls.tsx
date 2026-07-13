import { Flag, LocateFixed, MapPin, RefreshCw } from "lucide-react";
import { MapSelectionMode } from "@/lib/maps/types";

type MapMarkerControlsProps = {
  selectionMode: MapSelectionMode;
  onSelectionMode: (mode: MapSelectionMode) => void;
  onUseLocation: () => void;
  onRefreshRoute: () => void;
  locating: boolean;
};

export function MapMarkerControls({ selectionMode, onSelectionMode, onUseLocation, onRefreshRoute, locating }: MapMarkerControlsProps) {
  return (
    <div className="map-marker-controls" aria-label="Map controls">
      <button type="button" onClick={onUseLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding you" : "Use my location"}</button>
      <button type="button" className={selectionMode === "pickup" ? "active" : ""} onClick={() => onSelectionMode(selectionMode === "pickup" ? null : "pickup")}><MapPin size={17} />Set pickup</button>
      <button type="button" className={selectionMode === "destination" ? "active" : ""} onClick={() => onSelectionMode(selectionMode === "destination" ? null : "destination")}><Flag size={17} />Set destination</button>
      <button type="button" onClick={onRefreshRoute}><RefreshCw size={17} /><span className="hidden sm:inline">Refresh route</span></button>
    </div>
  );
}
