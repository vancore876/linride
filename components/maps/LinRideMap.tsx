"use client";

import { Box, LocateFixed, Map as MapIcon, Radio } from "lucide-react";
import maplibregl, {
  ExpressionSpecification,
  LngLatBounds,
  Map as MapLibreMap,
  Marker
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { getGeoapifyKey, getGeoapifyStyleUrl, reverseGeocodeJamaica } from "@/lib/maps/geoapify";
import { LinRideMapProps } from "@/lib/maps/types";
import { LiveDriverLocation, Place } from "@/types/linride";

const LINSTEAD_CENTER: [number, number] = [-77.031, 18.1366];
const BUILDING_LAYER_ID = "linride-3d-buildings";
const PICKUP_ACCURACY_SOURCE_ID = "linride-pickup-accuracy";

function accuracyCircle(latitude: number, longitude: number, radiusMeters: number): GeoJSON.Polygon {
  const latitudeRadius = radiusMeters / 111320;
  const longitudeRadius = radiusMeters / (111320 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));
  const coordinates = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [longitude + Math.cos(angle) * longitudeRadius, latitude + Math.sin(angle) * latitudeRadius];
  });
  return { type: "Polygon", coordinates: [coordinates] };
}

function validPlace(place?: Place) {
  return Boolean(place && Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) > 0.001 && Math.abs(place.lng) > 0.001);
}

function markerElement(kind: "pickup" | "destination" | "driver" | "assigned") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `linride-map-marker linride-map-marker-${kind}`;
  element.setAttribute("aria-label", kind === "assigned" ? "Assigned driver" : kind);
  element.innerHTML = kind === "driver" || kind === "assigned"
    ? '<span class="linride-driver-arrow"><i></i></span>'
    : `<span>${kind === "pickup" ? "P" : "D"}</span>`;
  return element;
}

function geometryCoordinates(geometry: GeoJSON.LineString | GeoJSON.MultiLineString) {
  return geometry.type === "LineString" ? geometry.coordinates : geometry.coordinates.flat();
}

function addDetailed3DLayers(map: MapLibreMap) {
  const style = map.getStyle();
  const labelLayer = style.layers.find((layer) => layer.type === "symbol" && Boolean(layer.layout?.["text-field"]));
  if (!map.getSource("default") || map.getLayer(BUILDING_LAYER_ID)) return;

  const buildingHeight = [
    "case",
    ["has", "render_height"], ["to-number", ["get", "render_height"], 8],
    ["has", "height"], ["to-number", ["get", "height"], 8],
    ["has", "levels"], ["*", ["to-number", ["get", "levels"], 2], 3],
    8
  ] as ExpressionSpecification;

  map.addLayer(
    {
      id: BUILDING_LAYER_ID,
      source: "default",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["zoom"],
          14, "#dce9dc",
          17, "#b6cdb8"
        ],
        "fill-extrusion-height": [
          "interpolate", ["linear"], ["zoom"],
          14, 0,
          15.5, buildingHeight
        ],
        "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.82,
        "fill-extrusion-vertical-gradient": true
      }
    },
    labelLayer?.id
  );

  if (map.getLayer("building-top")) map.setLayoutProperty("building-top", "visibility", "none");
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#b9deda");
  map.setLight({ anchor: "viewport", color: "#fff8df", intensity: 0.55, position: [1.2, 210, 35] });
}

function createDriverPopup(driver: LiveDriverLocation) {
  const node = document.createElement("div");
  node.className = "linride-driver-popup";

  const title = document.createElement("strong");
  title.textContent = "Driver online";
  const detail = document.createElement("span");
  const speedKmh = driver.speed && driver.speed > 0.5 ? Math.round(driver.speed * 3.6) : 0;
  detail.textContent = speedKmh > 0 ? `Moving at about ${speedKmh} km/h` : "Waiting nearby";
  node.append(title, detail);
  return node;
}

function animateMarker(
  marker: Marker,
  target: [number, number],
  driverId: string,
  frames: globalThis.Map<string, number>
) {
  const start = marker.getLngLat();
  const startedAt = performance.now();
  const duration = 1800;
  const existingFrame = frames.get(driverId);
  if (existingFrame) cancelAnimationFrame(existingFrame);

  const frame = (time: number) => {
    const rawProgress = Math.min(1, (time - startedAt) / duration);
    const progress = 1 - Math.pow(1 - rawProgress, 3);
    marker.setLngLat([
      start.lng + (target[0] - start.lng) * progress,
      start.lat + (target[1] - start.lat) * progress
    ]);
    if (rawProgress < 1) {
      frames.set(driverId, requestAnimationFrame(frame));
    } else {
      frames.delete(driverId);
    }
  };

  frames.set(driverId, requestAnimationFrame(frame));
}

export default function LinRideMap({
  pickup,
  destination,
  route,
  drivers = [],
  assignedDriverId,
  selectionMode,
  onMapSelect,
  onPickupMove,
  onDestinationMove
}: LinRideMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarkerRef = useRef<Marker | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const driverMarkersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const driverFramesRef = useRef<globalThis.Map<string, number>>(new globalThis.Map());
  const driverDataRef = useRef<globalThis.Map<string, LiveDriverLocation>>(new globalThis.Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const lastGpsFocusRef = useRef<string | null>(null);
  const selectionModeRef = useRef(selectionMode);
  const callbacksRef = useRef({ onMapSelect, onPickupMove, onDestinationMove });
  const perspectiveRef = useRef<"3d" | "2d">("3d");
  const [ready, setReady] = useState(false);
  const [perspective, setPerspective] = useState<"3d" | "2d">("3d");
  const [followAssigned, setFollowAssigned] = useState(Boolean(assignedDriverId));
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapAttempt, setMapAttempt] = useState(0);
  const apiKey = getGeoapifyKey();

  useEffect(() => {
    selectionModeRef.current = selectionMode;
    callbacksRef.current = { onMapSelect, onPickupMove, onDestinationMove };
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = selectionMode ? "crosshair" : "grab";
  }, [onDestinationMove, onMapSelect, onPickupMove, selectionMode]);

  useEffect(() => setFollowAssigned(Boolean(assignedDriverId)), [assignedDriverId]);

  useEffect(() => {
    if (!containerRef.current || !apiKey || mapRef.current) return;
    const container = containerRef.current;
    const driverMarkers = driverMarkersRef.current;
    const driverFrames = driverFramesRef.current;
    let map: MapLibreMap | null = null;
    let observer: ResizeObserver | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let cancelled = false;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (cancelled) return;
      setReady(false);
      setMapError("The browser paused map graphics. Your trip details are still available below.");
    };

    const handleContextRestored = () => {
      if (cancelled) return;
      setMapError(null);
      setReady(true);
    };

    // Waiting one frame prevents React Strict Mode from allocating two WebGL contexts in development.
    const startFrame = requestAnimationFrame(() => {
      if (cancelled) return;

      const is3D = perspectiveRef.current === "3d";
      let activeMap: MapLibreMap;
      try {
        activeMap = new maplibregl.Map({
          container,
          style: getGeoapifyStyleUrl(),
          center: LINSTEAD_CENTER,
          zoom: 13.4,
          pitch: is3D ? 48 : 0,
          bearing: is3D ? -18 : 0,
          maxPitch: 70,
          maxZoom: 19,
          attributionControl: false,
          canvasContextAttributes: {
            antialias: false,
            failIfMajorPerformanceCaveat: false,
            powerPreference: "low-power",
            preserveDrawingBuffer: false
          }
        });
      } catch {
        if (!cancelled) {
          setReady(false);
          setMapError("Map graphics could not start on this device. Booking and distance details still work.");
        }
        return;
      }

      if (cancelled) {
        activeMap.remove();
        return;
      }

      map = activeMap;
      mapRef.current = activeMap;
      canvas = activeMap.getCanvas();
      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);

      activeMap.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
      activeMap.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
          trackUserLocation: true,
          showUserLocation: true,
          showAccuracyCircle: true
        }),
        "top-right"
      );
      activeMap.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a> | <a href="https://openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a>'
      }));
      activeMap.on("load", () => {
        if (cancelled) return;
        if (perspectiveRef.current === "3d") {
          try {
            addDetailed3DLayers(activeMap);
          } catch {
            perspectiveRef.current = "2d";
            setPerspective("2d");
          }
        }
        setMapError(null);
        setReady(true);
      });
      activeMap.on("click", async (event) => {
        const mode = selectionModeRef.current;
        if (!mode || !callbacksRef.current.onMapSelect) return;
        const place = await reverseGeocodeJamaica(event.lngLat.lat, event.lngLat.lng);
        if (!cancelled) callbacksRef.current.onMapSelect(mode, place);
      });
      observer = new ResizeObserver(() => activeMap.resize());
      observer.observe(container);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(startFrame);
      observer?.disconnect();
      canvas?.removeEventListener("webglcontextlost", handleContextLost);
      canvas?.removeEventListener("webglcontextrestored", handleContextRestored);
      popupRef.current?.remove();
      driverFrames.forEach((frame) => cancelAnimationFrame(frame));
      driverFrames.clear();
      driverMarkers.forEach((marker) => marker.remove());
      driverMarkers.clear();
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [apiKey, mapAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    perspectiveRef.current = perspective;
    const is3D = perspective === "3d";
    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.setLayoutProperty(BUILDING_LAYER_ID, "visibility", is3D ? "visible" : "none");
    }
    map.easeTo({ pitch: is3D ? 52 : 0, bearing: is3D ? -18 : 0, duration: 650 });
  }, [perspective, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    ["linride-pickup-accuracy-outline", "linride-pickup-accuracy-fill"].forEach((layerId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });
    if (map.getSource(PICKUP_ACCURACY_SOURCE_ID)) map.removeSource(PICKUP_ACCURACY_SOURCE_ID);

    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = null;
    if (validPlace(pickup)) {
      if (pickup?.accuracyMeters && Number.isFinite(pickup.accuracyMeters)) {
        const radiusMeters = Math.min(5000, Math.max(5, pickup.accuracyMeters));
        map.addSource(PICKUP_ACCURACY_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: accuracyCircle(pickup.lat, pickup.lng, radiusMeters)
          }
        });
        map.addLayer({
          id: "linride-pickup-accuracy-fill",
          type: "fill",
          source: PICKUP_ACCURACY_SOURCE_ID,
          paint: { "fill-color": "#39b54a", "fill-opacity": 0.12 }
        });
        map.addLayer({
          id: "linride-pickup-accuracy-outline",
          type: "line",
          source: PICKUP_ACCURACY_SOURCE_ID,
          paint: { "line-color": "#278f3a", "line-width": 2, "line-opacity": 0.72 }
        });
      }
      const marker = new maplibregl.Marker({ element: markerElement("pickup"), draggable: true })
        .setLngLat([pickup!.lng, pickup!.lat])
        .addTo(map);
      marker.on("dragend", async () => {
        const point = marker.getLngLat();
        callbacksRef.current.onPickupMove?.(await reverseGeocodeJamaica(point.lat, point.lng));
      });
      pickupMarkerRef.current = marker;

      if (pickup?.accuracyMeters) {
        const focusKey = `${pickup.lat.toFixed(6)}:${pickup.lng.toFixed(6)}`;
        if (lastGpsFocusRef.current !== focusKey) {
          lastGpsFocusRef.current = focusKey;
          map.easeTo({ center: [pickup.lng, pickup.lat], zoom: Math.max(16, map.getZoom()), duration: 850 });
        }
      }
    }

    destinationMarkerRef.current?.remove();
    destinationMarkerRef.current = null;
    if (validPlace(destination)) {
      const marker = new maplibregl.Marker({ element: markerElement("destination"), draggable: true })
        .setLngLat([destination!.lng, destination!.lat])
        .addTo(map);
      marker.on("dragend", async () => {
        const point = marker.getLngLat();
        callbacksRef.current.onDestinationMove?.(await reverseGeocodeJamaica(point.lat, point.lng));
      });
      destinationMarkerRef.current = marker;
    }
  }, [destination, pickup, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const sourceId = "linride-route";
    ["linride-route-arrows", "linride-route-line", "linride-route-glow", "linride-route-casing"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (!route) return;

    map.addSource(sourceId, {
      type: "geojson",
      lineMetrics: true,
      data: { type: "Feature", properties: {}, geometry: route.routeGeometry }
    });
    map.addLayer({
      id: "linride-route-casing",
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#07130b", "line-width": 13, "line-opacity": 0.68 }
    });
    map.addLayer({
      id: "linride-route-glow",
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#8de04e", "line-width": 20, "line-opacity": 0.18, "line-blur": 3 }
    });
    map.addLayer({
      id: "linride-route-line",
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-width": 7,
        "line-opacity": 0.96,
        "line-gradient": [
          "interpolate", ["linear"], ["line-progress"],
          0, "#36bd43",
          0.72, "#9ada48",
          1, "#f2c94c"
        ]
      }
    });
    map.addLayer({
      id: "linride-route-arrows",
      type: "symbol",
      source: sourceId,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 90,
        "text-field": ">",
        "text-size": 15,
        "text-keep-upright": false,
        "text-rotation-alignment": "map"
      },
      paint: { "text-color": "#f8fff9", "text-halo-color": "#17311d", "text-halo-width": 1.5 }
    });
    const bounds = new LngLatBounds();
    geometryCoordinates(route.routeGeometry).forEach((coordinate) => bounds.extend(coordinate as [number, number]));
    if (validPlace(pickup)) bounds.extend([pickup!.lng, pickup!.lat]);
    if (validPlace(destination)) bounds.extend([destination!.lng, destination!.lat]);
    map.fitBounds(bounds, {
      padding: { top: 80, right: 70, bottom: 110, left: 70 },
      maxZoom: 16,
      duration: 900,
      pitch: perspective === "3d" ? 52 : 0,
      bearing: perspective === "3d" ? -18 : 0
    });
  }, [destination, perspective, pickup, ready, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    driverDataRef.current = new globalThis.Map(drivers.map((driver) => [driver.driverId, driver]));
    const activeIds = new Set(drivers.map((driver) => driver.driverId));
    driverMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        driverMarkersRef.current.delete(id);
        const frame = driverFramesRef.current.get(id);
        if (frame) cancelAnimationFrame(frame);
        driverFramesRef.current.delete(id);
      }
    });

    drivers.forEach((driver) => {
      const kind = driver.driverId === assignedDriverId ? "assigned" : "driver";
      let marker = driverMarkersRef.current.get(driver.driverId);
      if (!marker) {
        const element = markerElement(kind);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          const latest = driverDataRef.current.get(driver.driverId);
          if (!latest || !mapRef.current) return;
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 28, className: "linride-map-popup" })
            .setLngLat([latest.longitude, latest.latitude])
            .setDOMContent(createDriverPopup(latest))
            .addTo(mapRef.current);
          mapRef.current.easeTo({ center: [latest.longitude, latest.latitude], zoom: Math.max(mapRef.current.getZoom(), 15.5), duration: 700 });
        });
        marker = new maplibregl.Marker({ element, rotationAlignment: "map", pitchAlignment: "map" })
          .setLngLat([driver.longitude, driver.latitude])
          .addTo(map);
        driverMarkersRef.current.set(driver.driverId, marker);
      } else {
        animateMarker(marker, [driver.longitude, driver.latitude], driver.driverId, driverFramesRef.current);
      }

      const speedKmh = driver.speed && driver.speed > 0 ? Math.round(driver.speed * 3.6) : 0;
      const element = marker.getElement();
      element.className = `linride-map-marker linride-map-marker-${kind}`;
      element.dataset.moving = speedKmh > 2 ? "true" : "false";
      element.setAttribute("aria-label", `${kind === "assigned" ? "Assigned" : "Nearby"} driver ${speedKmh > 2 ? `moving at ${speedKmh} kilometers per hour` : "waiting"}`);
      if (Number.isFinite(driver.heading)) marker.setRotation(driver.heading || 0);

      if (followAssigned && driver.driverId === assignedDriverId) {
        map.easeTo({
          center: [driver.longitude, driver.latitude],
          pitch: perspective === "3d" ? 58 : 0,
          zoom: Math.max(map.getZoom(), 15.5),
          duration: 1500
        });
      }
    });
  }, [assignedDriverId, drivers, followAssigned, perspective, ready]);

  if (!apiKey) {
    return (
      <div className="linride-map-config">
        <strong>Map setup needed</strong>
        <p>Add <code>NEXT_PUBLIC_GEOAPIFY_API_KEY</code> to <code>.env.local</code>. Booking still works while the map is unavailable.</p>
      </div>
    );
  }

  const distanceKm = route ? route.distanceMeters / 1000 : null;
  const durationMinutes = route ? Math.max(1, Math.round(route.durationSeconds / 60)) : null;

  const retryMapIn2D = () => {
    perspectiveRef.current = "2d";
    setPerspective("2d");
    setReady(false);
    setMapError(null);
    setMapAttempt((attempt) => attempt + 1);
  };

  return (
    <div className="linride-map-stage">
      <div ref={containerRef} className="linride-map-canvas" aria-label="Lin Ride detailed 3D trip map" />
      {mapError ? (
        <div className="linride-map-config linride-map-recovery" role="alert">
          <MapIcon size={28} aria-hidden="true" />
          <strong>Map graphics paused</strong>
          <p>{mapError}</p>
          <button type="button" onClick={retryMapIn2D}>Retry in 2D</button>
        </div>
      ) : (
        <>
          <div className="linride-map-view-switch" role="group" aria-label="Map view">
            <button type="button" className={perspective === "3d" ? "active" : ""} onClick={() => setPerspective("3d")} aria-pressed={perspective === "3d"}>
              <Box size={15} /> 3D
            </button>
            <button type="button" className={perspective === "2d" ? "active" : ""} onClick={() => setPerspective("2d")} aria-pressed={perspective === "2d"}>
              <MapIcon size={15} /> 2D
            </button>
          </div>
          <div className="linride-map-live-hud">
            <span className="linride-map-live-count"><Radio size={14} /> {drivers.length} live {drivers.length === 1 ? "driver" : "drivers"}</span>
            {distanceKm != null && durationMinutes != null && (
              <span>{distanceKm.toFixed(1)} km <b>{durationMinutes} min</b></span>
            )}
          </div>
          {assignedDriverId && (
            <button type="button" className={`linride-map-follow ${followAssigned ? "active" : ""}`} onClick={() => setFollowAssigned((current) => !current)} aria-pressed={followAssigned}>
              <LocateFixed size={15} /> {followAssigned ? "Following driver" : "Follow driver"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
