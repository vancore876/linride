export type AppMode = "welcome" | "app";
export type Role = "rider" | "driver" | "business" | "admin";
export type ServiceType =
  | "Ride"
  | "Delivery"
  | "Errand"
  | "Shopping pickup"
  | "Business delivery"
  | "School run"
  | "Moving help"
  | "Route/shared ride"
  | "Urgent pickup"
  | "Shared Ride"
  | "Errand / Pickup"
  | "Courier"
  | "Town to Town";
export type VehicleType = "Bike" | "Car" | "Van" | "Truck" | "Taxi route car" | "Standard" | "Comfort" | "Van / Coaster" | "Bike / Courier";
export type PaymentMethod = "Cash" | "Transfer";
export type RideStatus = "pending" | "searching" | "reviewing" | "accepted" | "countered" | "cancelled";
export type TripStatus = "requested" | "offered" | "accepted" | "driver_arriving" | "arrived" | "in_progress" | "completed" | "cancelled";
export type BusinessDeliveryStatus = "Pending" | "Searching" | "Accepted" | "Picking up" | "Picked up" | "Delivering" | "Delivered" | "Cancelled";
export type DriverSubscriptionStatus = "inactive" | "pending" | "active" | "expired" | "rejected";
export type DriverDocumentsStatus = "missing" | "pending" | "approved" | "rejected";
export type UploadStatus = "Not uploaded" | "Uploaded" | "Pending review" | "Approved" | "Rejected";
export type BoostTag = "Rain" | "Bad road" | "Heavy package" | "Extra stop" | "Waiting time" | "Late night" | "Long distance" | "Return trip";
export type DriverBadge =
  | "Verified Driver"
  | "Active Weekly Pass"
  | "Local Linstead Driver"
  | "Top Rated"
  | "Clean Vehicle"
  | "Courier Approved";

export type Place = {
  name: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  placeId?: string;
  hint?: string;
  zone?: string;
  placeType?: string;
};

export type RouteEstimate = {
  distanceKm: number;
  distanceMiles: number;
  durationMinutes: number;
  pickupLabel: string;
  destinationLabel: string;
  pickupCoordinates: { lat: number; lng: number };
  destinationCoordinates: { lat: number; lng: number };
  source: "road" | "direct";
};

export type RouteDetails = {
  distanceMeters: number;
  durationSeconds: number;
  routeGeometry: GeoJSON.LineString | GeoJSON.MultiLineString;
};

export type LiveDriverLocation = {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  isOnline: boolean;
  isAvailable: boolean;
  updatedAt: string;
};

export type FareZone = {
  zoneName: string;
  minFareJmd: number;
  maxFareJmd: number;
  notes: string;
};

export type Profile = {
  id: string;
  role: Role;
  fullName: string;
  phone: string;
  avatarUrl?: string;
};

export type Driver = {
  id: string;
  profile: Profile;
  status: "pending" | "approved" | "rejected" | "suspended";
  documentsStatus: DriverDocumentsStatus;
  documentsRejectionReason?: string;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  lat: number;
  lng: number;
  subscriptionStatus: DriverSubscriptionStatus;
  subscriptionExpiresAt?: string;
  badges: DriverBadge[];
};

export type RideRequest = {
  id: string;
  pickup: Place;
  destination: Place;
  riderName: string;
  riderAvatarUrl?: string;
  offeredFareJmd: number;
  suggestedMinJmd: number;
  suggestedMaxJmd: number;
  serviceType: ServiceType;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  boostTags: BoostTag[];
  boostTotalJmd: number;
  isShared: boolean;
  distanceKm: number;
  status: "pending" | "requested" | "offered" | "accepted" | "countered" | "cancelled" | "completed";
  scheduledTime?: string;
  pickupLandmark?: string;
  destinationLandmark?: string;
  riderLocationNote?: string;
  callWhenNearby?: boolean;
  badRoadNote?: boolean;
  heavyItem?: boolean;
  fragileItem?: boolean;
  extraStop?: boolean;
  returnTrip?: boolean;
};

export type DriverOffer = {
  id: string;
  rideRequestId: string;
  driver: Driver;
  offerType: "accept" | "counter";
  fareJmd?: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt?: string;
};

export type TripRecord = {
  id: string;
  rideRequestId: string;
  riderId: string;
  driverId: string;
  agreedFareJmd?: number | null;
  tripPin?: string | null;
  pinVerified: boolean;
  status: TripStatus;
  driverArrivingAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  pickupName?: string;
  destinationName?: string;
  serviceType?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type TripMessage = {
  id: string;
  tripId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type TripCallSignalType = "offer" | "answer" | "ice" | "decline" | "hangup";

export type TripCallSignal = {
  id: string;
  callId: string;
  tripId: string;
  senderId: string;
  recipientId: string;
  signalType: TripCallSignalType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type RideRequestDraft = {
  pickup: Place;
  destination: Place;
  offeredFareJmd: number;
  serviceType: ServiceType;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  boostTags: BoostTag[];
  isShared: boolean;
  pickupLandmark?: string;
  dropoffLandmark?: string;
  customerNotes?: string;
  scheduledTime?: string;
  callWhenNearby?: boolean;
  badRoadNote?: boolean;
  heavyItem?: boolean;
  fragileItem?: boolean;
  extraStop?: boolean;
  returnTrip?: boolean;
  routeDetails?: RouteDetails;
};

export type ScheduledRide = {
  pickup: Place;
  destination: Place;
  time: string;
  daysOfWeek: string[];
  isShared: boolean;
  offeredFareJmd: number;
  notes: string;
  status: "Active" | "Paused" | "Cancelled";
};

export type BusinessDelivery = {
  id?: string;
  businessName: string;
  businessType: string;
  pickupBusinessName?: string;
  pickupAddress: string;
  customerName?: string;
  customerPhone?: string;
  dropoffAddress: string;
  packageDetails: string;
  deliveryOfferJmd: number;
  cashCollectionRequired: boolean;
  cashCollectionAmountJmd?: number;
  notes: string;
  status: BusinessDeliveryStatus;
  acceptedDriverId?: string | null;
  acceptedDriver?: Driver | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BusinessAccount = {
  id: string;
  ownerId: string;
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt?: string;
  updatedAt?: string;
};

export type BusinessDeliveryOffer = {
  id: string;
  deliveryId: string;
  driver: Driver;
  fareJmd: number;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
};

export type AdminStats = {
  totalDrivers: number;
  activeSubscribedDrivers: number;
  expiredDrivers: number;
  pendingPayments: number;
  activeRideRequests: number;
  completedTrips: number;
  weeklyRevenueJmd: number;
  pendingBusinesses: number;
  supportTickets: number;
};

export type PointsWallet = {
  availablePoints: number;
  pendingPoints: number;
  frozenPoints: number;
  lifetimeEarnedPoints: number;
  lifetimeWithdrawnPoints: number;
};

export type PointsTransaction = {
  id: string;
  amount: number;
  transactionType:
    | "earned"
    | "bonus"
    | "redeemed"
    | "adjusted"
    | "adjustment"
    | "withdrawal"
    | "withdrawal_requested"
    | "withdrawal_approved"
    | "withdrawal_rejected"
    | "frozen"
    | "reversed";
  reason: string;
  status: "pending" | "available" | "approved" | "completed" | "rejected" | "frozen" | "reversed";
  createdAt: string;
};

export type BankAccount = {
  accountHolderName: string;
  bankName: string;
  branchName?: string;
  accountNumber: string;
  accountType: "Savings" | "Chequing";
};

export type WithdrawalRequest = {
  id: string;
  walletType: "customer_points" | "driver_earnings" | "business_earnings";
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote?: string;
  createdAt: string;
  paidAt?: string;
};

export type PointsRuleSettings = {
  completedRide: number;
  completedDelivery: number;
  completedErrand: number;
  completedScheduledRide: number;
  firstCompletedTripBonus: number;
  referralBonus: number;
  ratingBonus: number;
  minimumWithdrawalPoints: number;
  pointsToJmdRate: number;
};

export type TripProofPhoto = {
  id: string;
  tripId?: string | null;
  businessDeliveryId?: string | null;
  uploaderId: string;
  storagePath: string;
  signedUrl?: string;
  proofType: "pickup" | "handoff" | "delivery" | "item" | "other";
  note?: string | null;
  createdAt: string;
};

export type TripRating = {
  id: string;
  tripId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  comment?: string | null;
  badges: string[];
  createdAt: string;
};

export type LinRideReport = {
  id: string;
  reporterId: string;
  reportedUserId?: string | null;
  tripId?: string | null;
  businessDeliveryId?: string | null;
  reportType: string;
  reason: string;
  details?: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  category: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PassengerWithdrawalRequest = {
  id: string;
  userId: string;
  points: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type DriverWithdrawalRequest = {
  id: string;
  driverId: string;
  amountJmd: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type DriverEarningsSummary = {
  todayTrips: number;
  todayEstimatedJmd: number;
  weekTrips: number;
  weekEstimatedJmd: number;
  platformPayoutAvailableJmd: number;
  completedTrips: Array<{
    id: string;
    amountJmd: number;
    earningType: string;
    earnedAt: string;
  }>;
};

export type AdminAuditLog = {
  id: string;
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId?: string | null;
  note?: string | null;
  createdAt: string;
};
