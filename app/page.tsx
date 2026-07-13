"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AppShell, AppView, ThemeMode } from "@/components/AppShell";
import { BusinessDeliveryForm } from "@/components/BusinessDeliveryForm";
import { DriverMode } from "@/components/DriverMode";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ProfilePhotoSetup } from "@/components/ProfilePhotoSetup";
import { RiderHome } from "@/components/RiderHome";
import { TripCommunicationPanel } from "@/components/TripCommunicationPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import {
  createBusinessAccount,
  acceptBusinessDelivery,
  acceptBusinessDeliveryCounterOffer,
  acceptDriverOffer,
  cancelRideRequest,
  counterBusinessDelivery,
  createReport,
  createSupportTicket,
  declineDriverOffer,
  ensureDriverProfile,
  approveDriverPayment,
  fetchAdminDashboardData,
  fetchDriverAccount,
  fetchDriverEarnings,
  getCurrentProfile,
  fetchPointsAccount,
  fetchTripParticipantProfile,
  fetchTripHistory,
  ignoreRideRequest,
  ignoreBusinessDelivery,
  insertDriverOffer,
  rejectDriverPayment,
  removeProfilePhoto,
  reviewDriverDocument,
  markDriverDocumentsSubmitted,
  subscribeToBusinessDeliveries,
  subscribeToActiveBusinessDeliveryForDriver,
  subscribeToActiveTripForDriver,
  subscribeToActiveTripForRider,
  subscribeToBusinessAccount,
  subscribeToBusinessDeliveryHistory,
  subscribeToBusinessDeliveryOffers,
  subscribeToPendingRideRequests,
  subscribeToRideOffers,
  subscribeToDriverAccount,
  subscribeToSupportTickets,
  submitBusinessDeliveryRequest,
  submitRideRequest,
  submitTripRating,
  updateBusinessDeliveryStatus,
  updateBusinessStatus,
  updateDriverStatus,
  updateDriverDocumentsStatus,
  updateSupportTicketStatus,
  updateTripStatus,
  updateBusinessDeliveryProgress,
  uploadDriverPaymentProof,
  uploadProfilePhoto,
  uploadTripProofPhoto,
  verifyTripPin,
  requestDriverWithdrawal,
  requestPassengerWithdrawal,
  reviewDriverWithdrawal,
  reviewPassengerWithdrawal,
  updateReportStatus,
  updatePointsRules,
  signInWithProfile,
  signOutCurrentUser,
  signUpWithProfile
} from "@/lib/backend";
import { isMockMode } from "@/lib/appMode";
import { mockAdminDashboardData, mockBusinessDelivery, mockDrivers, mockRideRequests, mockRider, popularPlaces } from "@/lib/mockData";
import { getSuggestedFare } from "@/lib/pricing";
import { reverseGeocodeJamaica } from "@/lib/maps/geoapify";
import { sendNotificationEvent, showAppNotification } from "@/lib/notifications";
import {
  distanceBetweenCoordinatesMeters,
  formatLocationAccuracy,
  geolocationErrorCode,
  getPreciseCurrentPosition
} from "@/lib/maps/geolocation";
import {
  AppMode,
  BusinessAccount,
  BusinessDelivery,
  BusinessDeliveryOffer,
  Driver,
  DriverEarningsSummary,
  DriverOffer,
  DriverSubscriptionStatus,
  DriverWithdrawalRequest,
  PassengerWithdrawalRequest,
  PointsRuleSettings,
  PointsTransaction,
  PointsWallet,
  Profile,
  RideRequest,
  RideRequestDraft,
  RideStatus,
  Role,
  RouteDetails,
  SupportTicket,
  TripRecord,
  TripStatus,
  WithdrawalRequest
} from "@/types/linride";

const DRIVER_VERIFICATION_FORM_URL =
  process.env.NEXT_PUBLIC_DRIVER_VERIFICATION_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSdm8uwXbycBV9TTGrHFslDo0-Yudxb3QpU56FIOzoffNq9ymw/viewform?usp=publish-editor";

const EMPTY_POINTS_WALLET: PointsWallet = {
  availablePoints: 0,
  pendingPoints: 0,
  frozenPoints: 0,
  lifetimeEarnedPoints: 0,
  lifetimeWithdrawnPoints: 0
};

const DEFAULT_POINTS_RULES: PointsRuleSettings = {
  completedRide: 10,
  completedDelivery: 8,
  completedErrand: 12,
  completedScheduledRide: 15,
  firstCompletedTripBonus: 50,
  referralBonus: 100,
  ratingBonus: 2,
  minimumWithdrawalPoints: 1000,
  pointsToJmdRate: 1
};

const EMPTY_DRIVER_EARNINGS: DriverEarningsSummary = {
  todayTrips: 0,
  todayEstimatedJmd: 0,
  weekTrips: 0,
  weekEstimatedJmd: 0,
  platformPayoutAvailableJmd: 0,
  completedTrips: []
};

export default function Home() {
  const [bootComplete, setBootComplete] = useState(false);
  const [mode, setMode] = useState<AppMode>("welcome");
  const [currentView, setCurrentView] = useState<AppView>("rider");
  const [rideStatus, setRideStatus] = useState<RideStatus>("pending");
  const [driverSubStatus, setDriverSubStatus] = useState<DriverSubscriptionStatus>("inactive");
  const [online, setOnline] = useState(false);
  const [counterOfferJmd, setCounterOfferJmd] = useState<number | null>(null);
  const [acceptedDriver, setAcceptedDriver] = useState<Driver | null>(null);
  const [driverOffers, setDriverOffers] = useState<DriverOffer[]>([]);
  const [ignoredRequestKeys, setIgnoredRequestKeys] = useState<string[]>([]);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<"unknown" | "requesting" | "granted" | "denied">("unknown");
  const [locationCandidate, setLocationCandidate] = useState<RideRequestDraft["pickup"] | null>(null);
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [businessDeliveryRequest, setBusinessDeliveryRequest] = useState<BusinessDelivery | null>(null);
  const [activeBusinessDelivery, setActiveBusinessDelivery] = useState<BusinessDelivery | null>(null);
  const [businessDeliveryStatus, setBusinessDeliveryStatus] = useState<BusinessDelivery["status"]>("Pending");
  const [activeRideRequestId, setActiveRideRequestId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);
  const [tripRiderProfile, setTripRiderProfile] = useState<Profile | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [tripBusy, setTripBusy] = useState(false);
  const [ratedTripIds, setRatedTripIds] = useState<string[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [tripHistory, setTripHistory] = useState<TripRecord[]>([]);
  const [pointsAccount, setPointsAccount] = useState<{
    wallet: PointsWallet;
    transactions: PointsTransaction[];
    withdrawals: PassengerWithdrawalRequest[];
    rules: PointsRuleSettings;
  } | null>(null);
  const [driverFinances, setDriverFinances] = useState<{
    summary: DriverEarningsSummary;
    withdrawals: DriverWithdrawalRequest[];
  } | null>(null);
  const [businessDeliveries, setBusinessDeliveries] = useState<BusinessDelivery[]>([]);
  const [businessDeliveryOffers, setBusinessDeliveryOffers] = useState<BusinessDeliveryOffer[]>([]);
  const [backendRideRequests, setBackendRideRequests] = useState<RideRequest[]>([]);
  const [adminData, setAdminData] = useState<any | null>(null);
  const [previewAdminData, setPreviewAdminData] = useState<any>(() => JSON.parse(JSON.stringify(mockAdminDashboardData)));
  const [profile, setProfile] = useState<{ id: string; role: Role; full_name?: string; phone?: string; avatar_url?: string } | null>(null);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const [driverAccount, setDriverAccount] = useState<Driver | null>(null);
  const [businessAccount, setBusinessAccount] = useState<BusinessAccount | null>(null);
  const [appMessage, setAppMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [draft, setDraft] = useState<RideRequestDraft>({
    pickup: popularPlaces[0],
    destination: popularPlaces[1],
    offeredFareJmd: 900,
    serviceType: "Ride",
    vehicleType: "Car",
    paymentMethod: "Cash",
    boostTags: [],
    isShared: false
  });
  const driverRequestIdsRef = useRef<Set<string>>(new Set());
  const driverRequestsLoadedRef = useRef(false);
  const previousPassengerTripRef = useRef<{ id: string; status: TripStatus } | null>(null);

  const googleVerificationFormUrl = DRIVER_VERIFICATION_FORM_URL;
  const localPreview = isMockMode;
  const displayAdminData = localPreview ? previewAdminData : adminData;
  const passengerWithdrawalHistory: WithdrawalRequest[] | undefined = pointsAccount?.withdrawals.map((request) => ({
    id: request.id,
    walletType: "customer_points",
    amount: request.points,
    status: request.status,
    adminNote: request.adminNote || undefined,
    createdAt: request.createdAt
  }));
  const driverWithdrawalHistory: WithdrawalRequest[] | undefined = driverFinances?.withdrawals.map((request) => ({
    id: request.id,
    walletType: "driver_earnings",
    amount: request.amountJmd,
    status: request.status,
    adminNote: request.adminNote || undefined,
    createdAt: request.createdAt
  }));
  const riderServiceHistory = tripHistory.map((trip) => ({
    id: trip.id,
    serviceType: trip.serviceType?.replaceAll("_", " ") || "Lin Ride trip",
    route: trip.pickupName && trip.destinationName ? `${trip.pickupName} to ${trip.destinationName}` : "Trip record",
    status: trip.status.replaceAll("_", " "),
    fareJmd: trip.agreedFareJmd || 0,
    points: trip.status === "completed" ? 10 : 0
  }));
  const completeBoot = useCallback(() => setBootComplete(true), []);
  const applyRouteDetails = useCallback((route: RouteDetails | null) => {
    setRouteDistanceKm(route ? route.distanceMeters / 1000 : null);
    setDraft((current) => (current.routeDetails === route ? current : { ...current, routeDetails: route || undefined }));
  }, []);
  const activeDriver = driverAccount ?? (localPreview ? mockDrivers[0] : null);
  const activeRider: Profile = profile
    ? {
        id: profile.id,
        role: "rider",
        fullName: profile.full_name || "Passenger",
        phone: profile.phone || "",
        avatarUrl: profile.avatar_url
      }
    : mockRider;
  const activeCommunicationTrip = activeTrip && ["accepted", "driver_arriving", "arrived", "in_progress"].includes(activeTrip.status)
    ? activeTrip
    : null;
  const communicationCounterpart = activeCommunicationTrip
    ? currentView === "rider"
      ? acceptedDriver?.profile || null
      : currentView === "driver"
        ? tripRiderProfile || {
            id: activeCommunicationTrip.riderId,
            role: "rider" as const,
            fullName: "Passenger",
            phone: ""
          }
        : null
    : null;
  const requiresProfilePhoto = Boolean(
    !localPreview &&
      profile &&
      (profile.role === "rider" || profile.role === "driver" || currentView === "rider" || currentView === "driver") &&
      !profile.avatar_url
  );

  const refreshPointsAccount = useCallback(async () => {
    if (localPreview || !profile?.id) return;
    try {
      setPointsAccount(await fetchPointsAccount(profile.id));
    } catch {
      setAppMessage("Could not load your points wallet.");
    }
  }, [localPreview, profile?.id]);

  const refreshDriverFinances = useCallback(async () => {
    if (localPreview || !driverRecord?.id) return;
    try {
      setDriverFinances(await fetchDriverEarnings(driverRecord.id));
    } catch {
      setAppMessage("Could not load driver earnings.");
    }
  }, [driverRecord?.id, localPreview]);

  const receiveActiveTrip = useCallback((trip: TripRecord | null) => {
    if (!trip) {
      setActiveTrip((current) => current && ["completed", "cancelled"].includes(current.status) ? current : null);
      return;
    }
    setActiveTrip((current) => ({
      ...current,
      ...trip,
      pickupName: trip.pickupName || current?.pickupName,
      destinationName: trip.destinationName || current?.destinationName,
      serviceType: trip.serviceType || current?.serviceType
    }));
    setRideStatus(trip.status === "cancelled" ? "cancelled" : "accepted");
    if (trip.status === "completed") {
      setAppMessage("Trip completed.");
      void refreshPointsAccount();
      void refreshDriverFinances();
    } else if (trip.status === "cancelled") {
      setAppMessage("Trip cancelled.");
    }
  }, [refreshDriverFinances, refreshPointsAccount]);
  const journey = (() => {
    if (currentView === "rider") {
      const searched = ["searching", "reviewing", "countered", "accepted"].includes(rideStatus);
      const checks = [!requiresProfilePhoto, routeDistanceKm != null, searched, Boolean(acceptedDriver)];
      const nextAction = requiresProfilePhoto
        ? "Add your profile photo"
        : routeDistanceKm == null
          ? "Set a pickup and destination"
          : !searched
            ? "Find nearby drivers"
            : !acceptedDriver
              ? "Choose the driver you want"
              : "Meet your driver and complete the trip";
      return { title: "Passenger journey", nextAction, reward: "Completed trips earn points", progress: checks.filter(Boolean).length * 25 };
    }
    if (currentView === "driver") {
      if (!activeDriver) {
        return {
          title: "Driver road level",
          nextAction: "Finish setting up your driver account",
          reward: "Completed jobs raise your level",
          progress: 0
        };
      }
      const checks = [activeDriver.status === "approved", activeDriver.documentsStatus === "approved", driverSubStatus === "active", online];
      const nextAction = activeDriver.status !== "approved"
        ? "Get your driver account approved"
        : activeDriver.documentsStatus !== "approved"
          ? "Complete document verification"
          : driverSubStatus !== "active"
            ? "Activate the weekly pass"
            : !online
              ? "Go online to receive nearby jobs"
              : "Accept a request and build your streak";
      return { title: "Driver road level", nextAction, reward: "Completed jobs raise your level", progress: checks.filter(Boolean).length * 25 };
    }
    if (currentView === "business") {
      const accountCreated = hasBusinessAccount || Boolean(businessAccount);
      const approved = hasBusinessAccount || businessAccount?.status === "approved";
      const deliveryCreated = businessDeliveryStatus !== "Pending";
      const delivered = businessDeliveryStatus === "Delivered";
      const checks = [accountCreated, approved, deliveryCreated, delivered];
      const nextAction = !accountCreated
        ? "Create your business delivery account"
        : !approved
          ? "Wait for admin approval"
          : !deliveryCreated
            ? "Create your first delivery"
            : !delivered
              ? "Track the active delivery"
              : "Start the next delivery run";
      return { title: "Business delivery run", nextAction, reward: "Delivered orders build your streak", progress: checks.filter(Boolean).length * 25 };
    }

    const pendingDocuments = displayAdminData?.documents?.filter((item: any) => item.status === "pending").length || 0;
    const pendingPayments = displayAdminData?.payments?.filter((item: any) => item.status === "pending").length || 0;
    const openSupport = displayAdminData?.support?.filter((item: any) => item.status !== "resolved").length || 0;
    const checks = [Boolean(displayAdminData), pendingDocuments === 0, pendingPayments === 0, openSupport === 0];
    const nextAction = !displayAdminData
      ? "Load the live admin dashboard"
      : pendingDocuments
        ? `Review ${pendingDocuments} driver document submission${pendingDocuments === 1 ? "" : "s"}`
        : pendingPayments
          ? `Review ${pendingPayments} weekly payment${pendingPayments === 1 ? "" : "s"}`
          : openSupport
            ? `Resolve ${openSupport} support ticket${openSupport === 1 ? "" : "s"}`
            : "All priority queues are clear";
    return { title: "Network guardian", nextAction, reward: "Clear queues keep LinRide moving", progress: checks.filter(Boolean).length * 25 };
  })();
  const livePricing = getSuggestedFare(draft.destination, draft.boostTags);
  const liveRideRequest: RideRequest = {
    id: "live-rider-offer",
    pickup: draft.pickup,
    destination: draft.destination,
    riderName: activeRider.fullName,
    riderAvatarUrl: activeRider.avatarUrl,
    offeredFareJmd: draft.offeredFareJmd,
    suggestedMinJmd: livePricing.min,
    suggestedMaxJmd: livePricing.max,
    serviceType: draft.serviceType,
    vehicleType: draft.vehicleType,
    paymentMethod: draft.paymentMethod,
    boostTags: draft.boostTags,
    boostTotalJmd: livePricing.boostTotal,
    isShared: draft.isShared || draft.serviceType === "Shared Ride" || draft.serviceType === "Route/shared ride",
    distanceKm: routeDistanceKm ?? 0,
    status: rideStatus === "accepted" ? "accepted" : rideStatus === "countered" ? "countered" : "pending",
    scheduledTime: draft.scheduledTime,
    pickupLandmark: draft.pickupLandmark,
    destinationLandmark: draft.dropoffLandmark,
    riderLocationNote: draft.customerNotes,
    callWhenNearby: draft.callWhenNearby,
    badRoadNote: draft.badRoadNote,
    heavyItem: draft.heavyItem,
    fragileItem: draft.fragileItem,
    extraStop: draft.extraStop,
    returnTrip: draft.returnTrip
  };
  const requestKey = (request: RideRequest) => `${request.id}:${request.offeredFareJmd}`;
  const liveRequestKey = requestKey(liveRideRequest);
  const showLiveRequest =
    rideStatus !== "cancelled" && rideStatus !== "accepted" && !ignoredRequestKeys.includes(liveRequestKey);
  const baseDriverRequests = localPreview ? mockRideRequests : backendRideRequests;
  const allDriverRequests = showLiveRequest && localPreview ? [liveRideRequest, ...baseDriverRequests] : baseDriverRequests;
  const driverRequests = allDriverRequests.filter((request) => !ignoredRequestKeys.includes(requestKey(request)));

  useEffect(() => {
    if (localPreview || currentView !== "driver" || !driverRecord?.id) return;
    driverRequestIdsRef.current = new Set();
    driverRequestsLoadedRef.current = false;
    const unsubscribe = subscribeToPendingRideRequests(
      driverRecord.id,
      (requests) => {
        const incoming = requests.filter((request) => !driverRequestIdsRef.current.has(request.id));
        driverRequestIdsRef.current = new Set(requests.map((request) => request.id));
        setBackendRideRequests(requests);
        if (driverRequestsLoadedRef.current && incoming.length) {
          const latest = incoming[0];
          void showAppNotification("New Lin Ride request", {
            body: `${latest.pickup.name} to ${latest.destination.name} - J$${latest.offeredFareJmd.toLocaleString()}`,
            tag: `ride-request-${latest.id}`,
            url: "/?view=driver"
          });
        }
        driverRequestsLoadedRef.current = true;
      },
      () => setAppMessage("Could not connect to Lin Ride. Check your internet.")
    );
    return () => {
      unsubscribe();
      driverRequestsLoadedRef.current = false;
      driverRequestIdsRef.current = new Set();
    };
  }, [currentView, driverRecord?.id, localPreview]);

  useEffect(() => {
    if (localPreview || !profile?.id) return;
    return subscribeToSupportTickets(
      profile.id,
      setSupportTickets,
      () => setAppMessage("Could not refresh support tickets.")
    );
  }, [localPreview, profile?.id]);

  useEffect(() => {
    if (localPreview || currentView !== "rider" || !profile?.id) return;
    return subscribeToActiveTripForRider(
      profile.id,
      receiveActiveTrip,
      () => setAppMessage("Could not refresh your active trip.")
    );
  }, [currentView, localPreview, profile?.id, receiveActiveTrip]);

  useEffect(() => {
    if (localPreview || currentView !== "driver" || !driverRecord?.id) return;
    return subscribeToActiveTripForDriver(
      driverRecord.id,
      receiveActiveTrip,
      () => setAppMessage("Could not refresh your active trip.")
    );
  }, [currentView, driverRecord?.id, localPreview, receiveActiveTrip]);

  useEffect(() => {
    if (localPreview || currentView !== "rider" || !activeTrip?.driverId) return;
    void fetchDriverAccount(activeTrip.driverId)
      .then(setAcceptedDriver)
      .catch(() => setAppMessage("Could not load your assigned driver."));
  }, [activeTrip?.driverId, currentView, localPreview]);

  useEffect(() => {
    if (localPreview || currentView !== "driver" || !activeTrip?.riderId) {
      setTripRiderProfile(null);
      return;
    }
    void fetchTripParticipantProfile(activeTrip.riderId)
      .then(setTripRiderProfile)
      .catch(() => setTripRiderProfile({ id: activeTrip.riderId, role: "rider", fullName: "Passenger", phone: "" }));
  }, [activeTrip?.riderId, currentView, localPreview]);

  useEffect(() => {
    if (localPreview || currentView !== "rider" || !activeTrip) {
      previousPassengerTripRef.current = null;
      return;
    }
    const previous = previousPassengerTripRef.current;
    if (previous?.id === activeTrip.id && previous.status !== activeTrip.status) {
      if (activeTrip.status === "driver_arriving") {
        void showAppNotification("Your driver is on the way", {
          body: `${acceptedDriver?.profile.fullName || "Your driver"} is driving to your pickup.`,
          tag: `trip-status-${activeTrip.id}`,
          url: "/?view=rider"
        });
      } else if (activeTrip.status === "arrived") {
        void showAppNotification("Your driver is nearby", {
          body: `${acceptedDriver?.profile.fullName || "Your driver"} has arrived at the pickup point.`,
          tag: `trip-status-${activeTrip.id}`,
          url: "/?view=rider"
        });
      }
    }
    previousPassengerTripRef.current = { id: activeTrip.id, status: activeTrip.status };
  }, [acceptedDriver?.profile.fullName, activeTrip, currentView, localPreview]);

  useEffect(() => {
    if (localPreview || !profile?.id) return;
    void refreshPointsAccount();
  }, [localPreview, profile?.id, refreshPointsAccount]);

  useEffect(() => {
    if (localPreview || !driverRecord?.id) return;
    void refreshDriverFinances();
  }, [driverRecord?.id, localPreview, refreshDriverFinances]);

  useEffect(() => {
    if (localPreview || !profile?.id) return;
    const params = currentView === "driver" && driverRecord?.id
      ? { driverId: driverRecord.id }
      : { riderId: profile.id };
    void fetchTripHistory(params)
      .then(setTripHistory)
      .catch(() => setAppMessage("Could not load trip history."));
  }, [activeTrip?.status, currentView, driverRecord?.id, localPreview, profile?.id]);

  useEffect(() => {
    if (localPreview || !businessAccount?.id) return;
    return subscribeToBusinessDeliveryHistory(
      businessAccount.id,
      (deliveries) => {
        setBusinessDeliveries(deliveries);
        const active = deliveries.find((delivery) => !["Delivered", "Cancelled"].includes(delivery.status));
        if (active) {
          setBusinessDeliveryRequest(active);
          setBusinessDeliveryStatus(active.status);
        }
      },
      () => setAppMessage("Could not refresh business deliveries.")
    );
  }, [businessAccount?.id, localPreview]);

  useEffect(() => {
    if (localPreview || !businessAccount?.id) return;
    return subscribeToBusinessDeliveryOffers(
      businessAccount.id,
      setBusinessDeliveryOffers,
      () => setAppMessage("Could not refresh driver counter offers.")
    );
  }, [businessAccount?.id, localPreview]);

  useEffect(() => {
    if (localPreview || !driverRecord?.id) return;
    return subscribeToDriverAccount(
      driverRecord.id,
      (driver) => {
        setDriverAccount(driver);
        setDriverSubStatus(driver.subscriptionStatus);
        if (driver.subscriptionStatus !== "active") setOnline(false);
      },
      () => setAppMessage("Could not refresh the driver account.")
    );
  }, [driverRecord?.id, localPreview]);

  useEffect(() => {
    if (localPreview || currentView !== "driver" || !driverRecord?.id) return;
    return subscribeToBusinessDeliveries(
      driverRecord.id,
      (deliveries) => setBusinessDeliveryRequest(deliveries[0] ?? null),
      () => setAppMessage("Could not connect to Lin Ride. Check your internet.")
    );
  }, [currentView, driverRecord?.id, localPreview]);

  useEffect(() => {
    if (localPreview || currentView !== "driver" || !driverRecord?.id) return;
    return subscribeToActiveBusinessDeliveryForDriver(
      driverRecord.id,
      setActiveBusinessDelivery,
      () => setAppMessage("Could not refresh your active business delivery.")
    );
  }, [currentView, driverRecord?.id, localPreview]);

  useEffect(() => {
    if (localPreview || currentView !== "business" || !profile?.id) return;
    return subscribeToBusinessAccount(
      profile.id,
      setBusinessAccount,
      () => setAppMessage("Could not load your business account.")
    );
  }, [currentView, localPreview, profile?.id]);

  const refreshAdminData = useCallback(async () => {
    if (localPreview || profile?.role !== "admin") return;
    try {
      setAdminData(await fetchAdminDashboardData());
    } catch {
      setAppMessage("Could not load your account.");
    }
  }, [profile?.role, localPreview]);

  const acceptOffer = useCallback(
    async (offer: DriverOffer) => {
      if (localPreview) {
        setAcceptedDriver(offer.driver);
        setDraft((current) => ({ ...current, offeredFareJmd: offer.fareJmd ?? current.offeredFareJmd }));
        setActiveTrip({
          id: "preview-trip",
          rideRequestId: offer.rideRequestId,
          riderId: "preview-rider",
          driverId: offer.driver.id,
          agreedFareJmd: offer.fareJmd,
          tripPin: "4826",
          pinVerified: false,
          status: "accepted"
        });
        setCounterOfferJmd(null);
        setDriverOffers([]);
        setRideStatus("accepted");
        return;
      }

      try {
        const trip = await acceptDriverOffer(offer.id);
        setActiveTrip(trip);
        setAcceptedDriver(offer.driver);
        setDraft((current) => ({ ...current, offeredFareJmd: trip.agreedFareJmd ?? offer.fareJmd ?? current.offeredFareJmd }));
        setCounterOfferJmd(null);
        setDriverOffers([]);
        setRideStatus("accepted");
        setAppMessage(`${offer.driver.profile.fullName} accepted your ride. Driver details are shown below.`);
      } catch {
        setAppMessage("Request already accepted by another driver.");
      }
    },
    [localPreview]
  );

  useEffect(() => {
    if (currentView === "admin") void refreshAdminData();
  }, [currentView, refreshAdminData]);

  useEffect(() => {
    if (localPreview || !activeRideRequestId || activeTrip) return;
    return subscribeToRideOffers(
      activeRideRequestId,
      (offers) => {
        const pendingOffers = offers.filter((offer) => offer.status === "pending");
        setDriverOffers(pendingOffers);
        setAcceptedDriver(null);
        if (pendingOffers.length > 0) {
          setRideStatus(pendingOffers.some((offer) => offer.offerType === "counter") ? "countered" : "reviewing");
          setAppMessage(`${pendingOffers.length} nearby driver${pendingOffers.length === 1 ? " has" : "s have"} responded. Choose your driver.`);
        }
      },
      () => setAppMessage("Could not connect to Lin Ride. Check your internet.")
    );
  }, [activeRideRequestId, activeTrip, localPreview]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("linride-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (localPreview) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("admin") !== "control") return;

    let active = true;
    const clearAdminFlag = () => {
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    };

    void getCurrentProfile()
      .then((adminProfile) => {
        if (!active) return;
        clearAdminFlag();
        if (adminProfile?.role !== "admin") {
          setAppMessage("Administrator session required.");
          return;
        }
        setProfile({
          id: adminProfile.id,
          role: "admin",
          full_name: adminProfile.full_name || "Lin Ride administrator",
          phone: adminProfile.phone || undefined,
          avatar_url: adminProfile.avatar_url || undefined
        });
        setMode("app");
        setCurrentView("admin");
        setAppMessage(null);
      })
      .catch(() => {
        if (!active) return;
        clearAdminFlag();
        setAppMessage("Administrator session required.");
      });

    return () => {
      active = false;
    };
  }, [localPreview]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("linride-theme", next);
      return next;
    });
  }

  async function changeView(view: AppView) {
    if (view === "driver" && !localPreview && profile && !driverRecord?.id) {
      try {
        setAppMessage("Setting up your driver profile...");
        const driver = await ensureDriverProfile(profile.id);
        const account = await fetchDriverAccount(driver.id);
        setDriverRecord({ id: driver.id });
        setDriverAccount(account);
        setDriverSubStatus(account.subscriptionStatus);
        setOnline(false);
        setAppMessage(null);
      } catch {
        setAppMessage("Could not set up the driver profile.");
        return;
      }
    }
    setCurrentView(view);
  }

  function updatePreviewDriverStatus(driverId: string, status: "approved" | "rejected" | "suspended" | "pending") {
    setPreviewAdminData((current: any) => ({
      ...current,
      drivers: current.drivers.map((driver: any) =>
        driver.id === driverId
          ? { ...driver, status, approved_at: status === "approved" ? new Date().toISOString() : driver.approved_at }
          : driver
      )
    }));
    setAppMessage(status === "approved" ? "Driver account approved. It becomes active when documents and payment are current." : `Driver account changed to ${status}.`);
  }

  function updatePreviewDocuments(driverId: string, status: "approved" | "rejected", reason?: string) {
    setPreviewAdminData((current: any) => ({
      ...current,
      drivers: current.drivers.map((driver: any) =>
        driver.id === driverId
          ? { ...driver, documents_status: status, documents_rejection_reason: status === "rejected" ? reason || "Verification rejected." : null }
          : driver
      ),
      documents: current.documents.map((document: any) =>
        document.driver_id === driverId ? { ...document, status, rejection_reason: reason || null } : document
      )
    }));
    setAppMessage(status === "approved" ? "Driver verification approved." : "Driver verification rejected.");
  }

  function updatePreviewPayment(paymentId: string, status: "approved" | "rejected") {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setPreviewAdminData((current: any) => {
      const payment = current.payments.find((item: any) => item.id === paymentId);
      return {
        ...current,
        payments: current.payments.map((item: any) =>
          item.id === paymentId ? { ...item, status, reviewed_at: new Date().toISOString() } : item
        ),
        subscriptions:
          status === "approved" && payment
            ? current.subscriptions.map((subscription: any) =>
                subscription.driver_id === payment.driver_id
                  ? { ...subscription, status: "active", starts_at: new Date().toISOString(), expires_at: expiresAt, approved_at: new Date().toISOString() }
                  : subscription
              )
            : current.subscriptions
      };
    });
    setAppMessage(status === "approved" ? "Weekly payment approved. The driver pass is active for 7 days." : "Weekly payment rejected.");
  }

  if (!bootComplete) {
    return <LoadingScreen onComplete={completeBoot} />;
  }

  function applyRiderGpsPickup(pickup: RideRequestDraft["pickup"]) {
    setDraft((current) => ({ ...current, pickup, routeDetails: undefined }));
    setLocationCandidate(null);
    setLocationPermission("granted");
    setLocationNotice(`Pickup set to ${pickup.name}. ${pickup.hint || "GPS location confirmed."}`);
  }

  async function requestRiderLocation(options: { startSearch: boolean }) {
    if (!("geolocation" in navigator)) {
      setLocationNotice("Location is not available on this device. Choose your pickup manually.");
      setLocationPermission("denied");
      if (options.startSearch) setRideStatus("reviewing");
      return;
    }

    setLocationPermission("requesting");
    setLocationCandidate(null);
    setLocationNotice("Your browser will ask to use your location. Tap Allow so drivers can find your pickup.");
    try {
      const position = await getPreciseCurrentPosition({
        onSample: (sample) => {
          setLocationNotice(`Improving GPS accuracy... currently within about ${formatLocationAccuracy(sample.coords.accuracy)}.`);
        }
      });
      const { latitude, longitude, accuracy } = position.coords;
      const accuracyLabel = formatLocationAccuracy(accuracy);
      setLocationNotice(`GPS found within about ${accuracyLabel}. Looking up the nearest mapped address...`);
      const pickup = await reverseGeocodeJamaica(latitude, longitude).catch(() => ({
        name: "My current GPS location",
        lat: latitude,
        lng: longitude
      }));
      const candidate = {
        ...pickup,
        lat: latitude,
        lng: longitude,
        accuracyMeters: accuracy,
        hint: `GPS accuracy: about ${accuracyLabel}`
      };
      const currentPickup = draft.pickup;
      const hasCurrentPickup = Number.isFinite(currentPickup.lat) && Number.isFinite(currentPickup.lng) && currentPickup.lat !== 0 && currentPickup.lng !== 0;
      const mismatchMeters = hasCurrentPickup
        ? distanceBetweenCoordinatesMeters(currentPickup.lat, currentPickup.lng, latitude, longitude)
        : 0;
      const needsConfirmation = accuracy > 250 || mismatchMeters > Math.max(3000, accuracy * 3);

      if (needsConfirmation) {
        const mismatchLabel = mismatchMeters >= 1000
          ? `${(mismatchMeters / 1000).toFixed(1)} km`
          : `${Math.round(mismatchMeters)} m`;
        setLocationCandidate(candidate);
        setLocationPermission("granted");
        setLocationNotice(
          hasCurrentPickup
            ? `Your device reports ${candidate.name}, ${mismatchLabel} from ${currentPickup.name}. It has not replaced your pickup.`
            : `Your device returned an approximate location near ${candidate.name}. Confirm it before using it as your pickup.`
        );
      } else {
        applyRiderGpsPickup(candidate);
      }
      if (options.startSearch) setRideStatus("reviewing");
    } catch (error) {
      setLocationPermission("denied");
      const code = geolocationErrorCode(error);
      setLocationNotice(
        code === 1
          ? "Location permission is off. Allow location for localhost in your browser settings, then try again."
          : "A reliable GPS position was not found. Move near a window and retry, or set the pickup pin manually."
      );
      if (options.startSearch) setRideStatus("reviewing");
    }
  }

  async function requestRiderLocationBeforeBooking() {
    setCounterOfferJmd(null);
    setAcceptedDriver(null);
    setDriverOffers([]);
    setActiveTrip(null);
    setPinMessage(null);
    setRideStatus("reviewing");
    if (!draft.routeDetails || !draft.pickup.lat || !draft.destination.lat) {
      setLocationNotice("Confirm a pickup and destination, then wait for the road route before finding a driver.");
      return;
    }
    setLocationNotice("Finding nearby drivers for this route.");
    const rideRequestId = await handleRideRequestInsert();
    if (!localPreview && rideRequestId) {
      setActiveRideRequestId(rideRequestId);
      return;
    }
    window.setTimeout(() => {
      const respondingDrivers = mockDrivers.filter(
        (driver) => driver.status === "approved" && driver.documentsStatus === "approved" && driver.subscriptionStatus === "active"
      );
      setDriverOffers(
        respondingDrivers.map((driver, index) => ({
          id: `preview-offer-${driver.id}`,
          rideRequestId: "preview-ride-request",
          driver,
          offerType: index === 1 ? "counter" : "accept",
          fareJmd: index === 1 ? draft.offeredFareJmd + 300 : draft.offeredFareJmd,
          status: "pending",
          createdAt: new Date().toISOString()
        }))
      );
      setRideStatus("reviewing");
      setAppMessage(`${respondingDrivers.length} nearby drivers responded. Choose the driver you want.`);
    }, 1000);
  }

  async function handleRideRequestInsert(): Promise<string | null> {
    if (localPreview || !profile) {
      setAppMessage("Nearby drivers are reviewing your offer.");
      return null;
    }
    try {
      const pricing = getSuggestedFare(draft.destination, draft.boostTags);
      const request = await submitRideRequest({
        riderId: profile.id,
        pickup: draft.pickup,
        destination: draft.destination,
        offeredFareJmd: draft.offeredFareJmd,
        suggestedMinJmd: pricing.min,
        suggestedMaxJmd: pricing.max,
        serviceType: draft.serviceType,
        vehicleType: draft.vehicleType,
        paymentMethod: draft.paymentMethod,
        boostTags: draft.boostTags,
        boostTotalJmd: pricing.boostTotal,
        isShared: draft.isShared || draft.serviceType === "Shared Ride" || draft.serviceType === "Route/shared ride",
        routeDetails: draft.routeDetails,
        pickupLandmark: draft.pickupLandmark,
        destinationLandmark: draft.dropoffLandmark,
        riderLocationNote: draft.customerNotes,
        scheduledTime: draft.scheduledTime,
        callWhenNearby: draft.callWhenNearby,
        badRoadNote: draft.badRoadNote,
        heavyItem: draft.heavyItem,
        fragileItem: draft.fragileItem,
        extraStop: draft.extraStop,
        returnTrip: draft.returnTrip
      });
      setAppMessage("Nearby drivers are reviewing your offer.");
      void sendNotificationEvent({ type: "ride_request", rideRequestId: request.id });
      return request.id;
    } catch {
      setAppMessage("Could not connect to Lin Ride. Check your internet.");
      return null;
    }
  }

  async function handleTripStatusChange(status: TripStatus, reason?: string) {
    if (!activeTrip) return;
    setTripBusy(true);
    setPinMessage(null);
    try {
      const updated = localPreview
        ? {
            ...activeTrip,
            status,
            driverArrivingAt: status === "driver_arriving" ? new Date().toISOString() : activeTrip.driverArrivingAt,
            arrivedAt: status === "arrived" ? new Date().toISOString() : activeTrip.arrivedAt,
            startedAt: status === "in_progress" ? new Date().toISOString() : activeTrip.startedAt,
            completedAt: status === "completed" ? new Date().toISOString() : activeTrip.completedAt,
            cancelledAt: status === "cancelled" ? new Date().toISOString() : activeTrip.cancelledAt,
            cancellationReason: status === "cancelled" ? reason : activeTrip.cancellationReason
          }
        : await updateTripStatus({ tripId: activeTrip.id, status, reason });
      receiveActiveTrip(updated);
      if (!localPreview && currentView === "driver" && (status === "driver_arriving" || status === "arrived")) {
        void sendNotificationEvent({ type: "trip_status", tripId: updated.id });
      }
      setAppMessage(status === "completed" ? "Trip completed." : status === "cancelled" ? "Trip cancelled." : "Trip status updated.");
    } catch (error) {
      setAppMessage(error instanceof Error ? error.message : "Could not update trip. Check your internet.");
      throw error;
    } finally {
      setTripBusy(false);
    }
  }

  async function handleDriverVerifyTripPin(pin: string) {
    if (!activeTrip) return;
    setTripBusy(true);
    try {
      const verified = localPreview ? pin === (activeTrip.tripPin || "4826") : await verifyTripPin({ tripId: activeTrip.id, pin });
      if (!verified) {
        setPinMessage("Trip PIN is incorrect.");
        return;
      }
      setActiveTrip((current) => current ? { ...current, pinVerified: true } : current);
      setPinMessage("PIN verified. You can start the trip.");
    } catch (error) {
      setPinMessage(error instanceof Error ? error.message : "Trip PIN could not be checked. Try again.");
    } finally {
      setTripBusy(false);
    }
  }

  async function handleTripProofUpload(file: File) {
    if (!activeTrip || !profile?.id) throw new Error("Choose an active trip before uploading proof.");
    if (localPreview) {
      setAppMessage("Proof photo attached in preview mode.");
      return;
    }
    await uploadTripProofPhoto({ uploaderId: profile.id, file, tripId: activeTrip.id, proofType: "delivery" });
    setAppMessage("Proof photo uploaded.");
  }

  async function handleTripRating(rating: number, comment: string, badges: string[]) {
    if (!activeTrip) throw new Error("Complete the trip before rating.");
    if (!localPreview) await submitTripRating({ tripId: activeTrip.id, rating, comment, badges });
    setRatedTripIds((current) => Array.from(new Set([...current, activeTrip.id])));
    setAppMessage("Rating submitted. Thank you.");
  }

  async function handleTripReport(reason: string, details: string) {
    if (!activeTrip || !profile?.id) throw new Error("Choose a trip before reporting an issue.");
    if (!localPreview) {
      await createReport({
        reporterId: profile.id,
        reportType: "trip_issue",
        reason,
        details,
        tripId: activeTrip.id,
        reportedUserId: currentView === "rider" ? acceptedDriver?.profile.id : activeTrip.riderId
      });
    }
    setAppMessage("Report submitted for admin review.");
  }

  async function openSupportTicket(category: string, message: string) {
    if (!profile?.id || localPreview) {
      setAppMessage("Support ticket opened in preview mode.");
      return;
    }
    await createSupportTicket({ userId: profile.id, category, message });
    setAppMessage("Support ticket opened.");
  }

  async function handleRiderCancellation(reason = "Passenger cancelled before pickup.") {
    try {
      if (activeTrip && !["completed", "cancelled", "in_progress"].includes(activeTrip.status)) {
        await handleTripStatusChange("cancelled", reason);
      } else if (activeRideRequestId && !localPreview) {
        await cancelRideRequest(activeRideRequestId, reason);
      }
    } catch (error) {
      setAppMessage(error instanceof Error ? error.message : "This ride request could not be cancelled.");
      throw error;
    }
    setCounterOfferJmd(null);
    setActiveRideRequestId(null);
    setDriverOffers([]);
    setAcceptedDriver(null);
    setRideStatus("cancelled");
  }

  async function enterRole(
    role: Role,
    options: { authMode: "signup" | "signin"; email: string; password: string; fullName: string; phone: string }
  ) {
    try {
      let nextRole = role;
      if (isMockMode) {
        const localName =
          options.fullName.trim() ||
          (role === "rider" ? "Passenger" : role === "driver" ? "Driver / Rider" : role === "business" ? "Business user" : "Admin");
        setProfile({ id: `local-${role}`, role, full_name: localName, phone: options.phone, avatar_url: "/icon.svg" });
        setDriverRecord(role === "driver" ? { id: "preview-driver" } : null);
        setDriverAccount(role === "driver" ? mockDrivers[0] : null);
        setDriverSubStatus(role === "driver" ? "active" : "inactive");
        setOnline(false);
        if (role === "business") {
          setHasBusinessAccount(true);
          setBusinessAccount({
            id: "preview-business",
            ownerId: `local-${role}`,
            businessName: localName,
            businessType: "Business",
            phone: options.phone,
            address: "Linstead, Jamaica",
            status: "approved"
          });
        } else {
          setHasBusinessAccount(false);
          setBusinessAccount(null);
        }
        setMode("app");
        setCurrentView(role === "admin" ? "admin" : role === "business" ? "business" : role === "driver" ? "driver" : "rider");
        setAppMessage(null);
        return;
      }
      if (!isMockMode) {
        if (!options.email || !options.password) {
          setAppMessage("Enter email and password to continue.");
          return;
        }
        if (options.authMode === "signup" && (!options.fullName || !options.phone)) {
          setAppMessage("Enter your name and phone number to sign up.");
          return;
        }
        const result =
          options.authMode === "signin"
            ? await signInWithProfile({
                email: options.email,
                password: options.password,
                fallbackRole: role
              })
            : await signUpWithProfile({
                email: options.email,
                password: options.password,
                fullName: options.fullName,
                phone: options.phone,
                role
              });
        if (result.profile?.role === "admin") {
          await signOutCurrentUser();
          setAppMessage("This account uses the private administrator sign-in.");
          return;
        }
        const resolvedRole = (result.profile?.role || role) as Role;
        nextRole = resolvedRole;
        setProfile({
          id: result.user.id,
          role: resolvedRole,
          full_name: result.profile?.full_name || options.fullName,
          phone: result.profile?.phone || options.phone,
          avatar_url: result.profile?.avatar_url || undefined
        });
        if (resolvedRole === "driver") {
          const driver = await ensureDriverProfile(result.user.id);
          setDriverRecord({ id: driver.id });
          const account = await fetchDriverAccount(driver.id);
          setDriverAccount(account);
          setDriverSubStatus(account.subscriptionStatus);
          setOnline(false);
        }
        if (resolvedRole === "admin") {
          setMode("app");
          setCurrentView("admin");
          setAppMessage(null);
          return;
        }
      }

      setMode("app");
      setCurrentView(nextRole === "business" ? "business" : nextRole === "driver" ? "driver" : "rider");
      setAppMessage(null);
    } catch (error) {
      setAppMessage(error instanceof Error ? error.message : "Could not connect to Lin Ride. Check your internet.");
    }
  }

  if (mode === "welcome") {
    return (
      <WelcomeScreen
        onChooseRole={(role, options) => void enterRole(role, options)}
        message={appMessage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <AppShell
      currentView={currentView}
      onChangeView={(view) => void changeView(view)}
      onBackHome={() => {
        if (!localPreview) void signOutCurrentUser().catch(() => undefined);
        setMode("welcome");
        setProfile(null);
        setDriverRecord(null);
        setDriverAccount(null);
        setDriverOffers([]);
        setOnline(false);
        setBusinessAccount(null);
        setHasBusinessAccount(false);
        setAcceptedDriver(null);
      }}
      allowAdmin={profile?.role === "admin"}
      theme={theme}
      onToggleTheme={toggleTheme}
      journey={journey}
    >
      {appMessage && <div className="app-message-banner" role="status">{appMessage}</div>}
      {!localPreview && profile && (currentView === "rider" || currentView === "driver") && (
        <ProfilePhotoSetup
          fullName={profile.full_name || (profile.role === "driver" ? "Driver" : "Passenger")}
          role={currentView === "driver" ? "driver" : profile.role}
          currentPhotoUrl={profile.avatar_url}
          onUpload={async (file) => {
            const avatarUrl = await uploadProfilePhoto(profile.id, file);
            setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current));
            setDriverAccount((current) => current ? { ...current, profile: { ...current.profile, avatarUrl } } : current);
            setAppMessage("Profile picture saved.");
            if (driverRecord?.id) {
              void fetchDriverAccount(driverRecord.id).then(setDriverAccount).catch(() => undefined);
            }
          }}
          onRemove={async () => {
            await removeProfilePhoto(profile.id);
            setProfile((current) => (current ? { ...current, avatar_url: undefined } : current));
            setDriverAccount((current) => current ? { ...current, profile: { ...current.profile, avatarUrl: undefined } } : current);
            setOnline(false);
            setAppMessage("Profile picture removed. Add a new one to continue.");
          }}
        />
      )}
      {!localPreview && profile && !requiresProfilePhoto && (currentView === "rider" || currentView === "driver") && (
        <NotificationSettings role={currentView} />
      )}
      {!localPreview && profile && !requiresProfilePhoto && activeCommunicationTrip && communicationCounterpart && (
        <TripCommunicationPanel
          tripId={activeCommunicationTrip.id}
          currentUserId={profile.id}
          counterpartUserId={communicationCounterpart.id}
          counterpartName={communicationCounterpart.fullName}
          counterpartAvatarUrl={communicationCounterpart.avatarUrl}
        />
      )}
      {!requiresProfilePhoto && currentView === "rider" && (
        <RiderHome
          rider={activeRider}
          draft={draft}
          rideStatus={rideStatus}
          counterOfferJmd={counterOfferJmd}
          locationNotice={locationNotice}
          locationPermission={locationPermission}
          locationCandidate={locationCandidate}
          drivers={localPreview ? mockDrivers : []}
          acceptedDriver={acceptedDriver}
          driverOffers={driverOffers}
          activeTrip={activeTrip}
          ratedTrip={Boolean(activeTrip && ratedTripIds.includes(activeTrip.id))}
          onRateTrip={handleTripRating}
          onReportTrip={handleTripReport}
          onDraftChange={(nextDraft) => {
            const normalizedDraft = {
              ...nextDraft,
              isShared: nextDraft.isShared || nextDraft.serviceType === "Shared Ride" || nextDraft.serviceType === "Route/shared ride"
            };
            setDraft(normalizedDraft);
            if (nextDraft.pickup.lat !== draft.pickup.lat || nextDraft.pickup.lng !== draft.pickup.lng) {
              setLocationCandidate(null);
            }
            if (nextDraft.offeredFareJmd !== draft.offeredFareJmd) {
              setRideStatus("reviewing");
            }
          }}
          onUseCurrentLocation={() => void requestRiderLocation({ startSearch: false })}
          onAcceptLocationCandidate={() => {
            if (locationCandidate) applyRiderGpsPickup(locationCandidate);
          }}
          onRejectLocationCandidate={() => {
            setLocationCandidate(null);
            setLocationNotice(`Kept ${draft.pickup.name} as your pickup. Use Set pickup to place the pin more exactly.`);
          }}
          onFindDriver={() => {
            void requestRiderLocationBeforeBooking();
          }}
          onRouteDetailsChange={applyRouteDetails}
          onAcceptCounter={() => {
            if (!activeDriver) {
              setAppMessage("Choose a driver offer first.");
              return;
            }
            if (counterOfferJmd) {
              setDraft((current) => ({ ...current, offeredFareJmd: counterOfferJmd }));
            }
            setAcceptedDriver((current) => current ?? activeDriver);
            setActiveTrip({
              id: "preview-trip",
              rideRequestId: activeRideRequestId ?? "preview-ride-request",
              riderId: mockRider.id,
              driverId: activeDriver.id,
              agreedFareJmd: counterOfferJmd ?? draft.offeredFareJmd,
              tripPin: "4826",
              pinVerified: false,
              status: "accepted"
            });
            setRideStatus("accepted");
          }}
          onDeclineCounter={() => {
            setCounterOfferJmd(null);
            setAcceptedDriver(null);
            setRideStatus("reviewing");
          }}
          onSelectDriverOffer={(offer) => void acceptOffer(offer)}
          onDeclineDriverOffer={async (offer) => {
            if (!localPreview) await declineDriverOffer(offer.id);
            setDriverOffers((current) => current.filter((item) => item.id !== offer.id));
            setRideStatus("reviewing");
            setAppMessage(`Offer from ${offer.driver.profile.fullName} declined. Other drivers can still respond.`);
          }}
          onCancel={handleRiderCancellation}
          onCreateSupportTicket={openSupportTicket}
          supportTickets={supportTickets}
          tripPin={activeTrip?.tripPin}
          tripPinVerified={activeTrip?.pinVerified}
          tripPinMessage={pinMessage}
          pointsWallet={localPreview ? undefined : pointsAccount?.wallet || EMPTY_POINTS_WALLET}
          pointTransactions={localPreview ? undefined : pointsAccount?.transactions || []}
          pointsRules={localPreview ? undefined : pointsAccount?.rules || DEFAULT_POINTS_RULES}
          withdrawalRequests={localPreview ? undefined : passengerWithdrawalHistory || []}
          serviceHistory={localPreview ? undefined : riderServiceHistory}
          onRequestWithdrawal={async (request) => {
            if (localPreview) {
              setAppMessage("Withdrawal request saved in preview mode.");
              return;
            }
            await requestPassengerWithdrawal({
              points: request.amount,
              bankName: request.bankName,
              accountName: request.accountHolderName,
              accountNumber: request.accountNumber,
              branch: request.branchName
            });
            await refreshPointsAccount();
            setAppMessage("Withdrawal request saved for admin review.");
          }}
        />
      )}
      {!requiresProfilePhoto && currentView === "driver" && activeDriver && (
        <DriverMode
          driver={activeDriver}
          requests={driverRequests}
          subscriptionStatus={driverSubStatus}
          online={online}
          onSubscriptionStatusChange={setDriverSubStatus}
          onOnlineChange={(nextOnline) => {
            setOnline(nextOnline);
          }}
          onAcceptRequest={async (request) => {
            if (!localPreview && driverRecord?.id) {
              try {
                await insertDriverOffer({ rideRequestId: request.id, driverId: driverRecord.id, offerType: "accept" });
                setBackendRideRequests((current) => current.filter((item) => item.id !== request.id));
                setAppMessage("Offer sent to the rider.");
              } catch {
                setAppMessage("Only approved drivers can receive requests.");
              }
              return;
            }
            setDriverOffers((current) => [
              ...current.filter((offer) => offer.driver.id !== activeDriver.id),
              {
                id: `preview-offer-${activeDriver.id}`,
                rideRequestId: request.id,
                driver: activeDriver,
                offerType: "accept",
                fareJmd: request.offeredFareJmd,
                status: "pending"
              }
            ]);
            setRideStatus("reviewing");
            setCurrentView("rider");
          }}
          onCounterRequest={async (request, fareJmd) => {
            if (!localPreview && driverRecord?.id) {
              try {
                await insertDriverOffer({ rideRequestId: request.id, driverId: driverRecord.id, offerType: "counter", fareJmd });
                setBackendRideRequests((current) => current.filter((item) => item.id !== request.id));
                setAppMessage("Counter offer sent to the rider.");
              } catch {
                setAppMessage("Only approved drivers can receive requests.");
              }
              return;
            }
            setDriverOffers((current) => [
              ...current.filter((offer) => offer.driver.id !== activeDriver.id),
              {
                id: `preview-counter-${activeDriver.id}`,
                rideRequestId: request.id,
                driver: activeDriver,
                offerType: "counter",
                fareJmd,
                status: "pending"
              }
            ]);
            setRideStatus("countered");
            setCurrentView("rider");
          }}
          onIgnoreRequest={(request) => {
            if (!localPreview && driverRecord?.id) {
              void ignoreRideRequest({ rideRequestId: request.id, driverId: driverRecord.id, ignoredFareJmd: request.offeredFareJmd }).catch(() =>
                setAppMessage("Could not connect to Lin Ride. Check your internet.")
              );
            }
            setIgnoredRequestKeys((current) => Array.from(new Set([...current, requestKey(request)])));
          }}
          backendDriverId={localPreview ? undefined : driverRecord?.id}
          onDocumentsSubmitted={async () => {
            if (!driverRecord?.id || localPreview) {
              setDriverAccount((current) => (current ? { ...current, documentsStatus: "pending" } : current));
              return;
            }
            try {
              await markDriverDocumentsSubmitted(driverRecord.id);
              setDriverAccount((current) => (current ? { ...current, documentsStatus: "pending" } : current));
              setAppMessage("Verification submitted. Waiting for admin approval.");
            } catch {
              setAppMessage("Could not mark the Google Form as submitted.");
            }
          }}
          onSubmitPaymentProof={async (driverId, proof) => {
            try {
              await uploadDriverPaymentProof({ driverId, ...proof });
              setAppMessage("Payment proof submitted. Waiting for admin approval.");
            } catch {
              setAppMessage("Upload failed. Try again.");
            }
          }}
          onCreateSupportTicket={openSupportTicket}
          supportTickets={supportTickets}
          activeTrip={activeTrip}
          tripMessage={pinMessage}
          tripBusy={tripBusy}
          onTripStatusChange={handleTripStatusChange}
          onVerifyTripPin={handleDriverVerifyTripPin}
          onUploadTripProof={handleTripProofUpload}
          ratedTrip={Boolean(activeTrip && ratedTripIds.includes(activeTrip.id))}
          onRateTrip={handleTripRating}
          onReportTrip={handleTripReport}
          earnings={localPreview ? undefined : driverFinances?.summary || EMPTY_DRIVER_EARNINGS}
          withdrawalRequests={localPreview ? undefined : driverWithdrawalHistory || []}
          onRequestWithdrawal={async (request) => {
            if (!driverRecord?.id || localPreview) {
              setAppMessage("Withdrawal request saved in preview mode.");
              return;
            }
            await requestDriverWithdrawal({
              driverId: driverRecord.id,
              amountJmd: request.amount,
              bankName: request.bankName,
              accountName: request.accountHolderName,
              accountNumber: request.accountNumber,
              branch: request.branchName
            });
            await refreshDriverFinances();
            setAppMessage("Driver withdrawal sent for admin review.");
          }}
          googleVerificationFormUrl={googleVerificationFormUrl}
          businessDelivery={businessDeliveryRequest}
          activeBusinessDelivery={activeBusinessDelivery}
          onBusinessDeliveryProgress={async (status, reason) => {
            if (!activeBusinessDelivery?.id) return;
            setTripBusy(true);
            try {
              const statusValue: Record<BusinessDelivery["status"], string> = {
                Pending: "pending",
                Searching: "searching",
                Accepted: "accepted",
                "Picking up": "picking_up",
                "Picked up": "picked_up",
                Delivering: "delivering",
                Delivered: "delivered",
                Cancelled: "cancelled"
              };
              const updated = localPreview
                ? { ...activeBusinessDelivery, status }
                : await updateBusinessDeliveryProgress({ deliveryId: activeBusinessDelivery.id, status: statusValue[status], reason });
              setActiveBusinessDelivery(updated);
              setAppMessage(status === "Delivered" ? "Business delivery completed." : status === "Cancelled" ? "Business delivery cancelled." : "Delivery status updated.");
              if (["Delivered", "Cancelled"].includes(status)) {
                if (status === "Delivered") await refreshDriverFinances();
                window.setTimeout(() => setActiveBusinessDelivery(null), 800);
              }
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Could not update delivery. Check your internet.");
              throw error;
            } finally {
              setTripBusy(false);
            }
          }}
          onUploadBusinessProof={async (file) => {
            if (!profile?.id || !activeBusinessDelivery?.id) return;
            if (!localPreview) {
              await uploadTripProofPhoto({
                uploaderId: profile.id,
                file,
                businessDeliveryId: activeBusinessDelivery.id,
                proofType: "delivery"
              });
            }
            setAppMessage("Delivery proof photo uploaded.");
          }}
          onAcceptBusinessDelivery={async () => {
            if (!localPreview && driverRecord?.id && businessDeliveryRequest && "id" in businessDeliveryRequest) {
              try {
                await acceptBusinessDelivery({ deliveryId: String((businessDeliveryRequest as any).id), driverId: driverRecord.id });
              } catch {
                setAppMessage("Request already accepted by another driver.");
                return;
              }
            }
            setBusinessDeliveryStatus("Accepted");
            setBusinessDeliveryRequest(null);
            setActiveBusinessDelivery((current) => current ?? (businessDeliveryRequest ? { ...businessDeliveryRequest, status: "Accepted", acceptedDriverId: driverRecord?.id } : null));
          }}
          onCounterBusinessDelivery={async (fareJmd) => {
            try {
              if (!localPreview && driverRecord?.id && businessDeliveryRequest?.id) {
                await counterBusinessDelivery({ deliveryId: businessDeliveryRequest.id, driverId: driverRecord.id, fareJmd });
              }
              setBusinessDeliveryRequest(null);
              setAppMessage(`Counter offer of J$${fareJmd.toLocaleString()} sent to the business.`);
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Counter offer could not be sent.");
            }
          }}
          onIgnoreBusinessDelivery={() => {
            if (!localPreview && driverRecord?.id && businessDeliveryRequest?.id) {
              void ignoreBusinessDelivery({
                deliveryId: businessDeliveryRequest.id,
                driverId: driverRecord.id,
                ignoredFareJmd: businessDeliveryRequest.deliveryOfferJmd
              }).catch(() => setAppMessage("Delivery could not be ignored. Try again."));
            }
            setBusinessDeliveryRequest(null);
          }}
        />
      )}
      {!requiresProfilePhoto && currentView === "business" && (
        <BusinessDeliveryForm
          delivery={{
            ...mockBusinessDelivery,
            businessName: businessAccount?.businessName || mockBusinessDelivery.businessName,
            businessType: businessAccount?.businessType || mockBusinessDelivery.businessType
          }}
          hasBusinessAccount={hasBusinessAccount || businessAccount?.status === "approved"}
          businessAccount={businessAccount}
          deliveries={localPreview ? businessDeliveries : businessDeliveries}
          counterOffers={businessDeliveryOffers}
          deliveryStatus={businessDeliveryStatus}
          supportTickets={supportTickets}
          onCreateSupportTicket={openSupportTicket}
          onCreateBusinessAccount={async (business) => {
            if (localPreview || !profile) {
              setHasBusinessAccount(true);
              return;
            }
            try {
              const account = await createBusinessAccount({ ownerId: profile.id, ...business });
              setBusinessAccount(account);
              setAppMessage("Business account waiting for approval.");
            } catch {
              setAppMessage("Could not connect to Lin Ride. Check your internet.");
            }
          }}
          onSubmitDelivery={async (delivery) => {
            setBusinessDeliveryStatus("Searching");
            setBusinessDeliveryRequest(delivery);
            if (localPreview) {
              const previewDelivery = { ...delivery, id: `preview-delivery-${Date.now()}` };
              setBusinessDeliveries((current) => [previewDelivery, ...current]);
              setBusinessDeliveryRequest(previewDelivery);
              return;
            }
            if (!localPreview && businessAccount?.id) {
              try {
                const created = await submitBusinessDeliveryRequest({ businessId: businessAccount.id, delivery });
                setBusinessDeliveryRequest({ ...delivery, id: created.id });
              } catch {
                setAppMessage("Could not connect to Lin Ride. Check your internet.");
              }
            }
          }}
          onCancelDelivery={async (deliveryId, reason) => {
            try {
              if (localPreview) {
                setBusinessDeliveries((current) => current.map((delivery) => delivery.id === deliveryId ? { ...delivery, status: "Cancelled" } : delivery));
              } else {
                await updateBusinessDeliveryProgress({ deliveryId, status: "cancelled", reason });
              }
              setBusinessDeliveryStatus("Cancelled");
              setAppMessage("Business delivery cancelled.");
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Could not cancel this delivery.");
            }
          }}
          onAcceptCounterOffer={async (offerId) => {
            if (localPreview) {
              setBusinessDeliveryOffers((current) => current.filter((offer) => offer.id !== offerId));
              setAppMessage("Driver counter offer accepted in preview mode.");
              return;
            }
            try {
              const accepted = await acceptBusinessDeliveryCounterOffer(offerId);
              setBusinessDeliveryOffers((current) => current.filter((offer) => offer.id !== offerId));
              setBusinessDeliveryStatus("Accepted");
              setBusinessDeliveryRequest(accepted);
              setAppMessage("Driver selected. Delivery is now active.");
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "This counter offer is no longer available.");
            }
          }}
          onReportDelivery={async (deliveryId, details) => {
            if (!profile?.id) return;
            try {
              if (!localPreview) {
                await createReport({
                  reporterId: profile.id,
                  reportType: "business_delivery_issue",
                  reason: "Business delivery issue",
                  details,
                  businessDeliveryId: deliveryId
                });
              }
              setAppMessage("Delivery report submitted for admin review.");
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Delivery report could not be submitted.");
            }
          }}
        />
      )}
      {!requiresProfilePhoto && currentView === "admin" && (
        <AdminDashboard
          isAdmin={profile?.role === "admin"}
          adminId={profile?.id}
          data={displayAdminData}
          onRefresh={refreshAdminData}
          onDriverStatus={async (driverId, status) => {
            if (localPreview) {
              updatePreviewDriverStatus(driverId, status);
              return;
            }
            try {
              await updateDriverStatus(driverId, status);
              await refreshAdminData();
              setAppMessage(status === "approved" ? "Driver account approved." : `Driver account changed to ${status}.`);
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onDocumentReview={async (documentId, driverId, status, reason) => {
            if (!profile?.id) return;
            if (localPreview) {
              updatePreviewDocuments(driverId, status, reason);
              return;
            }
            try {
              await reviewDriverDocument({ documentId, driverId, status, rejectionReason: reason, adminId: profile.id });
              await refreshAdminData();
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onDriverDocumentsStatus={async (driverId, status, reason) => {
            if (!profile?.id) return;
            if (localPreview) {
              updatePreviewDocuments(driverId, status, reason);
              return;
            }
            try {
              await updateDriverDocumentsStatus(driverId, status, profile.id, reason);
              await refreshAdminData();
              setAppMessage(status === "approved" ? "Driver verification approved." : "Driver verification rejected.");
            } catch {
              setAppMessage("Driver document approval failed. Try again.");
            }
          }}
          onApprovePayment={async (paymentId) => {
            if (!profile?.id) return;
            if (localPreview) {
              updatePreviewPayment(paymentId, "approved");
              return;
            }
            try {
              await approveDriverPayment(paymentId, profile.id);
              await refreshAdminData();
              setAppMessage("Weekly payment approved for 7 days.");
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onRejectPayment={async (paymentId, reason) => {
            if (!profile?.id) return;
            if (localPreview) {
              updatePreviewPayment(paymentId, "rejected");
              return;
            }
            try {
              await rejectDriverPayment(paymentId, reason);
              await refreshAdminData();
              setAppMessage("Weekly payment rejected.");
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onBusinessStatus={async (businessId, status) => {
            try {
              await updateBusinessStatus(businessId, status);
              await refreshAdminData();
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onDeliveryStatus={async (deliveryId, status) => {
            try {
              await updateBusinessDeliveryStatus(deliveryId, status);
              await refreshAdminData();
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onSupportStatus={async (ticketId, status, note) => {
            try {
              if (localPreview) {
                setAppMessage("Support ticket updated in preview mode.");
                return;
              }
              await updateSupportTicketStatus(ticketId, status, note);
              await refreshAdminData();
            } catch {
              setAppMessage("Admin approval failed. Try again.");
            }
          }}
          onTripStatus={async (tripId, status, reason) => {
            try {
              if (!localPreview) await updateTripStatus({ tripId, status: status as TripStatus, reason });
              await refreshAdminData();
              setAppMessage("Trip status updated.");
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Could not update trip. Check your internet.");
            }
          }}
          onPassengerWithdrawal={async (requestId, status, note) => {
            try {
              if (!localPreview) await reviewPassengerWithdrawal({ requestId, status, note });
              await refreshAdminData();
              setAppMessage(`Passenger withdrawal marked ${status}.`);
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Withdrawal review failed. Try again.");
            }
          }}
          onDriverWithdrawal={async (requestId, status, note) => {
            try {
              if (!localPreview) await reviewDriverWithdrawal({ requestId, status, note });
              await refreshAdminData();
              setAppMessage(`Driver withdrawal marked ${status}.`);
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Withdrawal review failed. Try again.");
            }
          }}
          onReportStatus={async (reportId, status, note) => {
            try {
              if (!localPreview) await updateReportStatus({ reportId, status, adminNote: note });
              await refreshAdminData();
              setAppMessage(`Report marked ${status.replace("_", " ")}.`);
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Report update failed. Try again.");
            }
          }}
          onPointsRules={async (rules) => {
            try {
              if (!localPreview) await updatePointsRules(rules);
              await refreshAdminData();
              setAppMessage("Points rules saved.");
            } catch (error) {
              setAppMessage(error instanceof Error ? error.message : "Points rules could not be updated. Try again.");
            }
          }}
        />
      )}
    </AppShell>
  );
}
