"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BriefcaseBusiness, Car, GraduationCap, Package, Route, Search, ShoppingBag, Truck, Zap } from "lucide-react";
import { BankWithdrawalCard, WithdrawalFormValues } from "@/components/BankWithdrawalCard";
import { BoostTagSelector } from "@/components/BoostTagSelector";
import { CountryServiceDetailsCard } from "@/components/CountryServiceDetailsCard";
import { LocalPlaceChips } from "@/components/LocalPlaceChips";
import { LocationSearch } from "@/components/maps/LocationSearch";
import { MapMarkerControls } from "@/components/maps/MapMarkerControls";
import { RouteSummaryCard } from "@/components/maps/RouteSummaryCard";
import { PointsWalletCard } from "@/components/PointsWalletCard";
import { DriverOfferSelection } from "@/components/DriverOfferSelection";
import { RideRequestCard } from "@/components/RideRequestCard";
import { RiderTripScreen } from "@/components/RiderTripScreen";
import { ServiceHistoryCard } from "@/components/ServiceHistoryCard";
import { SharedRidePanel } from "@/components/SharedRidePanel";
import { SupportButton } from "@/components/SupportButton";
import { TripPinCard } from "@/components/TripPinCard";
import { VehicleTypeSelector } from "@/components/VehicleTypeSelector";
import {
  mockPointsRules,
  mockPointsTransactions,
  mockPointsWallet,
  mockServiceHistory,
  mockWithdrawalRequests
} from "@/lib/mockData";
import {
  Driver,
  DriverOffer,
  Place,
  PointsRuleSettings,
  PointsTransaction,
  PointsWallet,
  Profile,
  RideRequestDraft,
  RideStatus,
  RouteDetails,
  ServiceType,
  SupportTicket,
  TripRecord,
  WithdrawalRequest
} from "@/types/linride";
import { ZonePricingCard } from "@/components/ZonePricingCard";
import { useDriverLocations } from "@/hooks/useDriverLocations";
import { useLinRideRoute } from "@/hooks/useLinRideRoute";
import { MapSelectionMode } from "@/lib/maps/types";

const LinRideMap = dynamic(() => import("@/components/maps/LinRideMap"), {
  ssr: false,
  loading: () => <div className="linride-map-loading">Loading Jamaica map...</div>
});

type RiderHomeProps = {
  rider: Profile;
  draft: RideRequestDraft;
  rideStatus: RideStatus;
  counterOfferJmd?: number | null;
  locationNotice?: string | null;
  locationPermission: "unknown" | "requesting" | "granted" | "denied";
  locationCandidate?: Place | null;
  drivers: Driver[];
  acceptedDriver?: Driver | null;
  driverOffers?: DriverOffer[];
  onDraftChange: (draft: RideRequestDraft) => void;
  onUseCurrentLocation: () => void;
  onAcceptLocationCandidate?: () => void;
  onRejectLocationCandidate?: () => void;
  onFindDriver: () => void;
  onRouteDetailsChange?: (route: RouteDetails | null) => void;
  onAcceptCounter: () => void;
  onDeclineCounter: () => void;
  onSelectDriverOffer?: (offer: DriverOffer) => void;
  onDeclineDriverOffer?: (offer: DriverOffer) => Promise<void> | void;
  onCancel: (reason?: string) => Promise<void> | void;
  onCreateSupportTicket?: (category: string, message: string) => Promise<void> | void;
  supportTickets?: SupportTicket[];
  activeTrip?: TripRecord | null;
  ratedTrip?: boolean;
  onRateTrip?: (rating: number, comment: string, badges: string[]) => Promise<void> | void;
  onReportTrip?: (reason: string, details: string) => Promise<void> | void;
  tripPin?: string | null;
  tripPinVerified?: boolean;
  tripPinMessage?: string | null;
  onVerifyTripPin?: (pin: string) => void;
  pointsWallet?: PointsWallet;
  pointTransactions?: PointsTransaction[];
  pointsRules?: PointsRuleSettings;
  withdrawalRequests?: WithdrawalRequest[];
  onRequestWithdrawal?: (request: WithdrawalFormValues) => Promise<void> | void;
  serviceHistory?: Array<{ id: string; serviceType: string; route: string; status: string; fareJmd: number; points: number }>;
};

const serviceTypes: Array<{ value: ServiceType; icon: typeof Route }> = [
  { value: "Ride", icon: Car },
  { value: "Shared Ride", icon: Route },
  { value: "Errand / Pickup", icon: Search },
  { value: "Courier", icon: Package },
  { value: "Delivery", icon: Package },
  { value: "Shopping pickup", icon: ShoppingBag },
  { value: "Business delivery", icon: BriefcaseBusiness },
  { value: "School run", icon: GraduationCap },
  { value: "Moving help", icon: Truck },
  { value: "Town to Town", icon: Route },
  { value: "Urgent pickup", icon: Zap }
];

const mainServiceTypes = serviceTypes.slice(0, 4);
const moreServiceTypes = serviceTypes.slice(4);

function SimpleSection({
  title,
  helper,
  children,
  defaultOpen = false
}: {
  title: string;
  helper: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="linride-card">
      <summary className="cursor-pointer list-none">
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-base font-black text-charcoal">{title}</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-charcoal/55">{helper}</span>
          </span>
          <span className="linride-status-badge linride-status-pending shrink-0">Tap to open</span>
        </span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

export function RiderHome({
  rider,
  draft,
  rideStatus,
  counterOfferJmd,
  locationNotice,
  locationPermission,
  locationCandidate,
  drivers,
  acceptedDriver,
  driverOffers = [],
  onDraftChange,
  onUseCurrentLocation,
  onAcceptLocationCandidate,
  onRejectLocationCandidate,
  onFindDriver,
  onRouteDetailsChange,
  onAcceptCounter,
  onDeclineCounter,
  onSelectDriverOffer,
  onDeclineDriverOffer,
  onCancel,
  onCreateSupportTicket,
  supportTickets = [],
  activeTrip,
  ratedTrip,
  onRateTrip,
  onReportTrip,
  tripPin,
  tripPinVerified,
  tripPinMessage,
  onVerifyTripPin,
  pointsWallet = mockPointsWallet,
  pointTransactions = mockPointsTransactions,
  pointsRules = mockPointsRules,
  withdrawalRequests = mockWithdrawalRequests,
  onRequestWithdrawal,
  serviceHistory = mockServiceHistory
}: RiderHomeProps) {
  const showErrandDetails =
    draft.serviceType === "Errand / Pickup" || draft.serviceType === "Errand" || draft.serviceType === "Shopping pickup";
  const tripDriver = acceptedDriver ?? drivers[0];
  const [selectionMode, setSelectionMode] = useState<MapSelectionMode>(null);
  const [pinsConfirmed, setPinsConfirmed] = useState(false);
  const { route, loading: routeLoading, error: routeError, refresh: refreshRoute } = useLinRideRoute(draft.pickup, draft.destination);
  const { locations: liveDriverLocations, error: driverLocationError } = useDriverLocations(acceptedDriver?.id);

  useEffect(() => onRouteDetailsChange?.(route), [onRouteDetailsChange, route]);
  useEffect(() => setPinsConfirmed(false), [draft.destination.lat, draft.destination.lng, draft.pickup.lat, draft.pickup.lng]);

  function updateTripPlace(kind: "pickup" | "destination", place: typeof draft.pickup) {
    onDraftChange({ ...draft, [kind]: place, routeDetails: undefined });
  }

  const renderServiceButton = (service: { value: ServiceType; icon: typeof Route }) => {
    const Icon = service.icon;
    const active = service.value === draft.serviceType;

    return (
      <button
        key={service.value}
        type="button"
        onClick={() =>
          onDraftChange({
            ...draft,
            serviceType: service.value,
            isShared: service.value === "Route/shared ride" || service.value === "Shared Ride"
          })
        }
        className={`linride-pill ${active ? "linride-pill-active" : ""}`}
      >
        <Icon className="mr-1 inline" size={16} />
        {service.value}
      </button>
    );
  };

  return (
    <div className="linride-screen">
      <section className="passenger-intro">
        <div>
          <p className="linride-eyebrow">Passenger mode</p>
          <h1>Where to, {rider.fullName.split(" ")[0]}?</h1>
          <p>Choose your trip, see the real road distance, then find a driver.</p>
        </div>
        <div className="passenger-intro-profile">
          {rider.avatarUrl && <Image unoptimized width={58} height={58} src={rider.avatarUrl} alt={`${rider.fullName} profile`} />}
          <span className="passenger-intro-badge">Jamaica-wide</span>
        </div>
      </section>

      <section className="trip-map-workspace">
        <div className="map-search-grid">
          <LocationSearch label="Pickup" value={draft.pickup} onChange={(pickup) => updateTripPlace("pickup", pickup)} />
          <LocationSearch label="Destination" value={draft.destination} onChange={(destination) => updateTripPlace("destination", destination)} />
        </div>
        <MapMarkerControls
          selectionMode={selectionMode}
          onSelectionMode={setSelectionMode}
          onUseLocation={onUseCurrentLocation}
          onRefreshRoute={refreshRoute}
          locating={locationPermission === "requesting"}
        />
        {(locationNotice || driverLocationError) && <p className="map-workspace-notice">{locationNotice || driverLocationError}</p>}
        {locationCandidate && (
          <div className="gps-location-check" role="alert">
            <div>
              <span>Check GPS result</span>
              <strong>{locationCandidate.name}</strong>
              <small>{locationCandidate.hint || "Approximate device location"}</small>
            </div>
            <div className="gps-location-check-actions">
              <button type="button" onClick={onAcceptLocationCandidate}>Use GPS result</button>
              <button type="button" onClick={onRejectLocationCandidate}>Keep {draft.pickup.name}</button>
            </div>
          </div>
        )}
        {selectionMode && <p className="map-workspace-notice">Tap the map to set your {selectionMode}, then drag the pin for the exact spot.</p>}
        <div className="linride-map-shell">
          <LinRideMap
            pickup={draft.pickup}
            destination={draft.destination}
            route={route}
            drivers={liveDriverLocations}
            assignedDriverId={acceptedDriver?.id}
            selectionMode={selectionMode}
            onMapSelect={(mode, place) => {
              updateTripPlace(mode, place);
              setSelectionMode(null);
            }}
            onPickupMove={(pickup) => updateTripPlace("pickup", pickup)}
            onDestinationMove={(destination) => updateTripPlace("destination", destination)}
          />
        </div>
        <RouteSummaryCard
          pickup={draft.pickup}
          destination={draft.destination}
          route={route}
          loading={routeLoading}
          error={routeError}
          fareJmd={draft.offeredFareJmd}
          onRefresh={refreshRoute}
        />
        <button
          type="button"
          className={`map-confirm-button ${pinsConfirmed ? "confirmed" : ""}`}
          disabled={!route || routeLoading}
          onClick={() => setPinsConfirmed(true)}
        >
          {pinsConfirmed ? "Pickup and destination confirmed" : "Confirm pickup and destination"}
        </button>
      </section>

      <section className="linride-panel-grid">
        <div className="linride-card min-w-0 max-w-full">
          <p className="linride-eyebrow">Start here</p>
          <h2 className="text-3xl font-black">Hi {rider.fullName}, book your trip.</h2>
          <p className="linride-card-desc mt-2">
            Fill in pickup, destination, and the price you want to offer.
          </p>

          <div className="linride-field">
            <span className="linride-label">1. What do you need?</span>
            <div className="linride-pill-group">{mainServiceTypes.map(renderServiceButton)}</div>
            <details className="mt-3 rounded-2xl bg-smoke p-3">
              <summary className="cursor-pointer list-none text-sm font-black text-charcoal">More services</summary>
              <div className="linride-pill-group mt-3">{moreServiceTypes.map(renderServiceButton)}</div>
            </details>
          </div>

          <label className="linride-field block">
            <span className="linride-label">Notes for the driver</span>
            <textarea
              value={draft.customerNotes || ""}
              onChange={(event) => onDraftChange({ ...draft, customerNotes: event.target.value })}
              className="linride-textarea"
              placeholder="Example: rough road past the church, fragile box, heavy item"
            />
          </label>

          <div className="linride-row-2">
            <div className="linride-field">
              <span className="linride-label">4. Your fare</span>
              <div className="linride-fare-stepper">
                <button
                  type="button"
                  onClick={() => onDraftChange({ ...draft, offeredFareJmd: Math.max(500, draft.offeredFareJmd - 100) })}
                  className="linride-step-button"
                  aria-label="Decrease fare"
                >
                  -
                </button>
                <div className="linride-fare-display">${draft.offeredFareJmd.toLocaleString()}</div>
                <button
                  type="button"
                  onClick={() => onDraftChange({ ...draft, offeredFareJmd: draft.offeredFareJmd + 100 })}
                  className="linride-step-button"
                  aria-label="Increase fare"
                >
                  +
                </button>
              </div>
            </div>

            <div className="linride-field">
              <span className="linride-label">5. Payment</span>
              <div className="linride-pill-group">
                {(["Cash", "Transfer"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onDraftChange({ ...draft, paymentMethod: method })}
                    className={`linride-pill flex-1 ${draft.paymentMethod === method ? "linride-pill-active" : ""}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" onClick={onFindDriver} disabled={!route || !pinsConfirmed} className="linride-submit">
            Find a driver
          </button>
          {!pinsConfirmed && <p className="mt-2 text-center text-xs font-bold text-charcoal/50">Confirm the map pins before finding a driver.</p>}
        </div>

        <div className="min-w-0 max-w-full space-y-4">
        {driverOffers.length > 0 && onSelectDriverOffer && (
          <DriverOfferSelection
            offers={driverOffers}
            draft={draft}
            onSelect={onSelectDriverOffer}
            onDecline={onDeclineDriverOffer}
          />
        )}
        <RideRequestCard
          draft={draft}
          status={rideStatus}
          counterOfferJmd={counterOfferJmd}
          locationNotice={locationNotice}
          locationPermission={locationPermission}
          onFindDriver={onFindDriver}
          onAcceptCounter={onAcceptCounter}
          onDeclineCounter={onDeclineCounter}
          onCancel={onCancel}
        />

          {rideStatus === "accepted" && tripDriver && (
            <RiderTripScreen
              driver={tripDriver}
              draft={draft}
              trip={activeTrip}
              rated={ratedTrip}
              onCancel={(reason) => onCancel(reason)}
              onRate={onRateTrip}
              onReport={onReportTrip}
            />
          )}
          {rideStatus === "accepted" && activeTrip && !activeTrip.pinVerified && !["in_progress", "completed", "cancelled"].includes(activeTrip.status) && (
            <TripPinCard mode="display" pin={tripPin} verified={tripPinVerified} message={tripPinMessage} onVerify={onVerifyTripPin} />
          )}

          <details className="linride-card min-w-0 max-w-full overflow-hidden">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-base font-black text-charcoal">More choices</span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-charcoal/55">
                    Vehicle type and quick local places.
                  </span>
                </span>
                <span className="linride-status-badge linride-status-pending shrink-0">Open</span>
              </span>
            </summary>
            <div className="mt-4 min-w-0 max-w-full space-y-4">
              <section>
                <h3>Vehicle type</h3>
                <p className="linride-card-desc">Pick what fits your request.</p>
                <VehicleTypeSelector value={draft.vehicleType} onChange={(vehicleType) => onDraftChange({ ...draft, vehicleType })} />
              </section>
              <LocalPlaceChips onSelect={(destination) => onDraftChange({ ...draft, destination })} />
            </div>
          </details>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <SimpleSection
          title="Optional trip details"
          helper="Use this only when the trip needs extra details."
          defaultOpen={showErrandDetails}
        >
          <ZonePricingCard destination={draft.destination} boostTags={draft.boostTags} />
          <BoostTagSelector value={draft.boostTags} destination={draft.destination} onChange={(boostTags) => onDraftChange({ ...draft, boostTags })} />
          <SharedRidePanel isShared={draft.isShared || draft.serviceType === "Shared Ride" || draft.serviceType === "Route/shared ride"} />
          <CountryServiceDetailsCard draft={draft} onChange={onDraftChange} />
        </SimpleSection>

        <SimpleSection title="Wallet and past trips" helper="Check points, withdrawals, and ride history when you need them.">
          <PointsWalletCard wallet={pointsWallet} transactions={pointTransactions} rules={pointsRules} />
          <BankWithdrawalCard
            title="Withdraw passenger points"
            balance={pointsWallet.availablePoints}
            unitLabel="points"
            minimumAmount={pointsRules.minimumWithdrawalPoints}
            conversionHelp={`${pointsRules.minimumWithdrawalPoints.toLocaleString()} points minimum. ${pointsRules.pointsToJmdRate} point equals JMD $${pointsRules.pointsToJmdRate}.`}
            requests={withdrawalRequests}
            onSubmit={onRequestWithdrawal}
          />
          <ServiceHistoryCard history={serviceHistory} />
        </SimpleSection>

        <SupportButton tickets={supportTickets} onCreateTicket={onCreateSupportTicket} />
      </div>
    </div>
  );
}
