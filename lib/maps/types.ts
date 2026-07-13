import { LiveDriverLocation, Place, RouteDetails } from "@/types/linride";

export type GeoapifySuggestion = {
  formatted: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  category?: string;
};

export type MapSelectionMode = "pickup" | "destination" | null;

export type LinRideMapProps = {
  pickup?: Place;
  destination?: Place;
  route?: RouteDetails | null;
  drivers?: LiveDriverLocation[];
  assignedDriverId?: string;
  selectionMode?: MapSelectionMode;
  onMapSelect?: (mode: Exclude<MapSelectionMode, null>, place: Place) => void;
  onPickupMove?: (place: Place) => void;
  onDestinationMove?: (place: Place) => void;
};
