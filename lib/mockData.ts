import {
  AdminStats,
  BankAccount,
  BusinessDelivery,
  Driver,
  FareZone,
  Place,
  PointsRuleSettings,
  PointsTransaction,
  PointsWallet,
  Profile,
  RideRequest,
  ScheduledRide,
  WithdrawalRequest
} from "@/types/linride";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";

export const LINSTEAD_CENTER = {
  lat: 18.1366,
  lng: -77.031
};

export const fareZones: FareZone[] = [
  { zoneName: "Linstead Town", minFareJmd: 500, maxFareJmd: 800, notes: "Short town hops and local pickup points." },
  { zoneName: "Bog Walk", minFareJmd: 1000, maxFareJmd: 1800, notes: "Bog Walk corridor estimate." },
  { zoneName: "Ewarton", minFareJmd: 1300, maxFareJmd: 1800, notes: "North west community route." },
  { zoneName: "Treadways", minFareJmd: 1000, maxFareJmd: 1700, notes: "Treadways and nearby district routes." },
  { zoneName: "Cheesefield", minFareJmd: 1000, maxFareJmd: 1700, notes: "Cheesefield and nearby district routes." },
  { zoneName: "Spanish Town", minFareJmd: 1500, maxFareJmd: 2500, notes: "Town to town corridor." },
  { zoneName: "Kingston / Half-Way Tree", minFareJmd: 3000, maxFareJmd: 4500, notes: "Kingston commute corridor." },
  { zoneName: "Deep district / custom quote", minFareJmd: 1800, maxFareJmd: 6000, notes: "Drivers may counter based on road and timing." }
];

export const popularPlaces: Place[] = [
  { name: "Barry Main Rd", lat: 18.1374, lng: -77.0295, hint: "Central pickup", zone: "Linstead Town", placeType: "road" },
  { name: "KFC Linstead", lat: 18.1361, lng: -77.0304, hint: "Food stop", zone: "Linstead Town", placeType: "food" },
  { name: "Linstead Market", lat: 18.1379, lng: -77.0317, hint: "Town centre", zone: "Linstead Town", placeType: "market" },
  { name: "Linstead Hospital", lat: 18.1418, lng: -77.0355, hint: "Hospital road", zone: "Linstead Town", placeType: "health" },
  { name: "Linstead Police Station", lat: 18.1348, lng: -77.0288, hint: "Main road", zone: "Linstead Town", placeType: "safety" },
  { name: "Juici Patties Linstead", lat: 18.1368, lng: -77.0307, hint: "Food stop", zone: "Linstead Town", placeType: "food" },
  { name: "Linstead Bus Park", lat: 18.1372, lng: -77.0323, hint: "Transport hub", zone: "Linstead Town", placeType: "transport" },
  { name: "Ewarton", lat: 18.1835, lng: -77.0858, hint: "North west", zone: "Ewarton", placeType: "community" },
  { name: "Bog Walk", lat: 18.1024, lng: -77.0051, hint: "South east", zone: "Bog Walk", placeType: "community" },
  { name: "Treadways", lat: 18.1543, lng: -77.0548, hint: "Nearby community", zone: "Treadways", placeType: "community" },
  { name: "Cheesefield", lat: 18.1194, lng: -77.0494, hint: "Local route", zone: "Cheesefield", placeType: "community" },
  { name: "Spanish Town", lat: 17.9959, lng: -76.9551, hint: "Town to town", zone: "Spanish Town", placeType: "town" },
  { name: "Kingston Half-Way Tree", lat: 18.0106, lng: -76.7962, hint: "Kingston route", zone: "Kingston / Half-Way Tree", placeType: "city" }
];

export const jamaicaPlaces: Place[] = [
  ...popularPlaces,
  { name: "Kingston", lat: 17.9712, lng: -76.7936, hint: "Capital city", zone: "Kingston / Half-Way Tree", placeType: "city" },
  { name: "New Kingston", lat: 18.0075, lng: -76.7832, hint: "Business district", zone: "Kingston / Half-Way Tree", placeType: "district" },
  { name: "Downtown Kingston", lat: 17.9647, lng: -76.7936, hint: "Waterfront and Parade", zone: "Kingston / Half-Way Tree", placeType: "district" },
  { name: "Cross Roads", lat: 18.0007, lng: -76.7898, hint: "Kingston", zone: "Kingston / Half-Way Tree", placeType: "district" },
  { name: "Papine", lat: 18.0147, lng: -76.7416, hint: "Kingston", zone: "Kingston / Half-Way Tree", placeType: "district" },
  { name: "Constant Spring", lat: 18.0481, lng: -76.7938, hint: "St Andrew", zone: "Kingston / Half-Way Tree", placeType: "district" },
  { name: "Harbour View", lat: 17.9497, lng: -76.7189, hint: "East Kingston", zone: "Kingston / Half-Way Tree", placeType: "community" },
  { name: "Portmore", lat: 17.9503, lng: -76.8822, hint: "St Catherine", zone: "Spanish Town", placeType: "city" },
  { name: "Old Harbour", lat: 17.9412, lng: -77.1088, hint: "St Catherine", zone: "Spanish Town", placeType: "town" },
  { name: "Old Harbour Bay", lat: 17.9098, lng: -77.0978, hint: "St Catherine coast", zone: "Spanish Town", placeType: "community" },
  { name: "May Pen", lat: 17.9658, lng: -77.2452, hint: "Clarendon", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Chapelton", lat: 18.0856, lng: -77.2703, hint: "Clarendon", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Lionel Town", lat: 17.8077, lng: -77.2409, hint: "Clarendon", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Mandeville", lat: 18.0417, lng: -77.5071, hint: "Manchester", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Christiana", lat: 18.1745, lng: -77.4907, hint: "Manchester", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Santa Cruz", lat: 18.0534, lng: -77.6987, hint: "St Elizabeth", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Black River", lat: 18.0257, lng: -77.8487, hint: "St Elizabeth", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Junction", lat: 17.9197, lng: -77.5957, hint: "St Elizabeth", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Alligator Pond", lat: 17.8708, lng: -77.5679, hint: "Manchester coast", zone: "Deep district / custom quote", placeType: "community" },
  { name: "Savanna-la-Mar", lat: 18.219, lng: -78.1332, hint: "Westmoreland", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Negril", lat: 18.2683, lng: -78.3472, hint: "Westmoreland", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Montego Bay", lat: 18.4762, lng: -77.8939, hint: "St James", zone: "Deep district / custom quote", placeType: "city" },
  { name: "Sangster International Airport", lat: 18.5037, lng: -77.9134, hint: "Montego Bay airport", zone: "Deep district / custom quote", placeType: "airport" },
  { name: "Falmouth", lat: 18.4936, lng: -77.6559, hint: "Trelawny", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Lucea", lat: 18.4506, lng: -78.1736, hint: "Hanover", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Ocho Rios", lat: 18.4074, lng: -77.1031, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "St Ann's Bay", lat: 18.4358, lng: -77.2024, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Runaway Bay", lat: 18.4596, lng: -77.3289, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Brown's Town", lat: 18.3974, lng: -77.3686, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Discovery Bay", lat: 18.4584, lng: -77.3995, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Moneague", lat: 18.2756, lng: -77.1208, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Claremont", lat: 18.325, lng: -77.2158, hint: "St Ann", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Port Maria", lat: 18.3688, lng: -76.8894, hint: "St Mary", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Oracabessa", lat: 18.4031, lng: -76.9465, hint: "St Mary", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Highgate", lat: 18.2754, lng: -76.8956, hint: "St Mary", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Annotto Bay", lat: 18.2749, lng: -76.7662, hint: "St Mary", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Port Antonio", lat: 18.1761, lng: -76.4502, hint: "Portland", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Buff Bay", lat: 18.2321, lng: -76.6613, hint: "Portland", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Morant Bay", lat: 17.8815, lng: -76.4093, hint: "St Thomas", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Yallahs", lat: 17.8743, lng: -76.5637, hint: "St Thomas", zone: "Deep district / custom quote", placeType: "town" },
  { name: "Bull Bay", lat: 17.9444, lng: -76.6685, hint: "St Andrew / St Thomas", zone: "Deep district / custom quote", placeType: "community" },
  { name: "Guys Hill", lat: 18.1832, lng: -76.9991, hint: "St Catherine", zone: "Deep district / custom quote", placeType: "community" },
  { name: "Sligoville", lat: 18.0565, lng: -76.9744, hint: "St Catherine", zone: "Spanish Town", placeType: "community" },
  { name: "Norman Manley International Airport", lat: 17.9357, lng: -76.7875, hint: "Kingston airport", zone: "Kingston / Half-Way Tree", placeType: "airport" },
  { name: "UWI Mona", lat: 18.0056, lng: -76.7469, hint: "Kingston campus", zone: "Kingston / Half-Way Tree", placeType: "school" },
  { name: "University Hospital of the West Indies", lat: 18.0124, lng: -76.7445, hint: "Kingston hospital", zone: "Kingston / Half-Way Tree", placeType: "health" },
  { name: "Devon House", lat: 18.0175, lng: -76.7899, hint: "Kingston landmark", zone: "Kingston / Half-Way Tree", placeType: "landmark" },
  { name: "Emancipation Park", lat: 18.0027, lng: -76.7886, hint: "Kingston landmark", zone: "Kingston / Half-Way Tree", placeType: "landmark" },
  { name: "National Stadium", lat: 17.9991, lng: -76.7738, hint: "Kingston landmark", zone: "Kingston / Half-Way Tree", placeType: "landmark" }
];

export const mockRider: Profile = {
  id: "rider-kimani",
  role: "rider",
  fullName: "Kimani",
  phone: "876-555-0124",
  avatarUrl: "/icon.svg"
};

export const mockBusinessProfile: Profile = {
  id: "business-spice-pot",
  role: "business",
  fullName: "Spice Pot Cook Shop",
  phone: "876-555-4400"
};

export const mockDrivers: Driver[] = [
  {
    id: "driver-marcus",
    profile: { id: "profile-marcus", role: "driver", fullName: "Marcus Brown", phone: "876-555-1001", avatarUrl: "/icon.svg" },
    status: "approved",
    documentsStatus: "approved",
    vehicleType: "Standard",
    vehicleMake: "Toyota",
    vehicleModel: "Corolla",
    vehicleColor: "Silver",
    plateNumber: "PA 2847",
    lat: 18.138,
    lng: -77.0322,
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2026-07-14T18:00:00Z",
    badges: ["Verified Driver", "Active Weekly Pass", "Local Linstead Driver", "Clean Vehicle"]
  },
  {
    id: "driver-andre",
    profile: { id: "profile-andre", role: "driver", fullName: "Andre", phone: "876-555-1002", avatarUrl: "/icon.svg" },
    status: "approved",
    documentsStatus: "approved",
    vehicleType: "Comfort",
    vehicleMake: "Honda",
    vehicleModel: "Fit",
    vehicleColor: "Blue",
    plateNumber: "PD 7431",
    lat: 18.1336,
    lng: -77.0279,
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2026-07-14T18:00:00Z",
    badges: ["Verified Driver", "Active Weekly Pass", "Top Rated", "Local Linstead Driver"]
  },
  {
    id: "driver-shawn",
    profile: { id: "profile-shawn", role: "driver", fullName: "Shawn", phone: "876-555-1003", avatarUrl: "/icon.svg" },
    status: "approved",
    documentsStatus: "pending",
    vehicleType: "Standard",
    vehicleMake: "Toyota",
    vehicleModel: "Axio",
    vehicleColor: "White",
    plateNumber: "PC 5282",
    lat: 18.1404,
    lng: -77.0259,
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2026-07-13T18:00:00Z",
    badges: ["Verified Driver", "Active Weekly Pass", "Courier Approved"]
  },
  {
    id: "driver-terry",
    profile: { id: "profile-terry", role: "driver", fullName: "Terry", phone: "876-555-1004", avatarUrl: "/icon.svg" },
    status: "approved",
    documentsStatus: "approved",
    vehicleType: "Van / Coaster",
    vehicleMake: "Toyota",
    vehicleModel: "Hiace",
    vehicleColor: "White",
    plateNumber: "PP 8102",
    lat: 18.1301,
    lng: -77.0363,
    subscriptionStatus: "expired",
    badges: ["Verified Driver", "Local Linstead Driver"]
  }
];

export const mockRideRequests: RideRequest[] = [
  {
    id: "ride-1",
    pickup: popularPlaces[1],
    destination: popularPlaces[8],
    riderName: "Kimani",
    offeredFareJmd: 1200,
    suggestedMinJmd: 1000,
    suggestedMaxJmd: 1800,
    serviceType: "Ride",
    vehicleType: "Standard",
    paymentMethod: "Cash",
    boostTags: ["Rain"],
    boostTotalJmd: 200,
    isShared: false,
    distanceKm: 8.2,
    status: "pending"
  },
  {
    id: "ride-2",
    pickup: popularPlaces[2],
    destination: popularPlaces[7],
    riderName: "Nadine",
    offeredFareJmd: 1500,
    suggestedMinJmd: 1300,
    suggestedMaxJmd: 1800,
    serviceType: "Shared Ride",
    vehicleType: "Comfort",
    paymentMethod: "Transfer",
    boostTags: [],
    boostTotalJmd: 0,
    isShared: true,
    distanceKm: 10.8,
    status: "pending"
  },
  {
    id: "ride-3",
    pickup: popularPlaces[0],
    destination: popularPlaces[12],
    riderName: "Omar",
    offeredFareJmd: 4200,
    suggestedMinJmd: 3000,
    suggestedMaxJmd: 4500,
    serviceType: "Town to Town",
    vehicleType: "Van / Coaster",
    paymentMethod: "Cash",
    boostTags: ["Late night", "Return trip"],
    boostTotalJmd: 1800,
    isShared: false,
    distanceKm: 36.5,
    status: "countered"
  }
];

export const mockScheduledRide: ScheduledRide = {
  pickup: popularPlaces[0],
  destination: popularPlaces[12],
  time: "06:30",
  daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  isShared: true,
  offeredFareJmd: 3500,
  notes: "Every weekday at 6:30 AM from Linstead to Half-Way Tree.",
  status: "Active"
};

export const mockBusinessDelivery: BusinessDelivery = {
  businessName: "Spice Pot Cook Shop",
  businessType: "Restaurant",
  pickupBusinessName: "Kim's Cook Shop",
  pickupAddress: "Barry Main Rd, Linstead",
  customerName: "Shanice Brown",
  customerPhone: "876-000-0000",
  dropoffAddress: "Bog Walk customer dropoff",
  packageDetails: "Two lunch boxes and bottled drinks",
  deliveryOfferJmd: 900,
  cashCollectionRequired: true,
  cashCollectionAmountJmd: 2500,
  notes: "Call customer before arrival.",
  status: "Pending"
};

export const mockAdminStats: AdminStats = {
  totalDrivers: 4,
  activeSubscribedDrivers: 3,
  expiredDrivers: 1,
  pendingPayments: 2,
  activeRideRequests: 3,
  completedTrips: 42,
  weeklyRevenueJmd: 6000,
  pendingBusinesses: 1,
  supportTickets: 3
};

export const mockPointsWallet: PointsWallet = {
  availablePoints: 1340,
  pendingPoints: 42,
  frozenPoints: 0,
  lifetimeEarnedPoints: 2210,
  lifetimeWithdrawnPoints: 600
};

export const mockPointsTransactions: PointsTransaction[] = [
  {
    id: "points-ride-1",
    amount: 10,
    transactionType: "earned",
    reason: "Completed ride from Linstead to Bog Walk",
    status: "available",
    createdAt: "2026-06-12T15:12:00Z"
  },
  {
    id: "points-errand-1",
    amount: 12,
    transactionType: "earned",
    reason: "Completed errand pickup at Linstead Market",
    status: "pending",
    createdAt: "2026-06-13T19:35:00Z"
  },
  {
    id: "points-first-trip",
    amount: 50,
    transactionType: "bonus",
    reason: "First completed trip bonus",
    status: "available",
    createdAt: "2026-06-10T11:20:00Z"
  },
  {
    id: "points-withdrawal-1",
    amount: -600,
    transactionType: "withdrawal",
    reason: "Bank withdrawal paid",
    status: "available",
    createdAt: "2026-06-08T09:10:00Z"
  }
];

export const mockBankAccount: BankAccount = {
  accountHolderName: "Kimani Brown",
  bankName: "National Commercial Bank",
  branchName: "Linstead",
  accountNumber: "**** 4921",
  accountType: "Savings"
};

export const mockWithdrawalRequests: WithdrawalRequest[] = [
  {
    id: "withdrawal-1",
    walletType: "customer_points",
    amount: 600,
    status: "paid",
    adminNote: "Paid by manual bank transfer.",
    createdAt: "2026-06-08T08:00:00Z",
    paidAt: "2026-06-08T15:30:00Z"
  },
  {
    id: "withdrawal-2",
    walletType: "customer_points",
    amount: 1000,
    status: "pending",
    createdAt: "2026-06-14T10:00:00Z"
  }
];

export const mockDriverWithdrawalRequests: WithdrawalRequest[] = [
  {
    id: "driver-withdrawal-1",
    walletType: "driver_earnings",
    amount: 8500,
    status: "paid",
    adminNote: "Paid to bank account after weekly reconciliation.",
    createdAt: "2026-06-07T10:00:00Z",
    paidAt: "2026-06-07T16:45:00Z"
  },
  {
    id: "driver-withdrawal-2",
    walletType: "driver_earnings",
    amount: 6000,
    status: "pending",
    createdAt: "2026-06-14T12:20:00Z"
  }
];

export const mockDriverEarningsBalanceJmd = 18500;

export const mockBusinessWithdrawalRequests: WithdrawalRequest[] = [
  {
    id: "business-withdrawal-1",
    walletType: "business_earnings",
    amount: 12000,
    status: "pending",
    createdAt: "2026-06-14T13:05:00Z"
  }
];

export const mockBusinessEarningsBalanceJmd = 26000;

export const mockBusinessDeliveryHistory = [
  {
    id: "business-history-1",
    customerName: "Shanice Brown",
    route: "Main Street, Linstead to Treadways",
    status: "Delivered",
    feeJmd: 900,
    cashCollectedJmd: 2500
  },
  {
    id: "business-history-2",
    customerName: "Omar Lewis",
    route: "Barry Main Rd to Bog Walk",
    status: "Searching",
    feeJmd: 800,
    cashCollectedJmd: 0
  }
];

export const mockPointsRules: PointsRuleSettings = {
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

export const mockServiceAreas = [
  "Linstead",
  "Bog Walk",
  "Ewarton",
  "Treadways",
  "Cheesefield",
  "Spanish Town",
  "Half-Way Tree",
  "Deep district routes"
];

export const mockServiceHistory = [
  {
    id: "history-1",
    serviceType: "Ride",
    route: "KFC Linstead to Bog Walk",
    status: "Completed",
    fareJmd: 1200,
    points: 10
  },
  {
    id: "history-2",
    serviceType: "Errand",
    route: "Linstead Market pickup to Barry Main Rd",
    status: "Completed",
    fareJmd: 850,
    points: 12
  },
  {
    id: "history-3",
    serviceType: "Moving help",
    route: "Cheesefield to Linstead Town",
    status: "Scheduled",
    fareJmd: 4500,
    points: 0
  }
];

const mockAdminDrivers = mockDrivers.map((driver) => ({
  id: driver.id,
  user_id: driver.profile.id,
  status: driver.status,
  documents_status: driver.documentsStatus,
  documents_rejection_reason: driver.documentsRejectionReason,
  vehicle_type: driver.vehicleType,
  vehicle_make: driver.vehicleMake,
  vehicle_model: driver.vehicleModel,
  vehicle_color: driver.vehicleColor,
  plate_number: driver.plateNumber,
  created_at: "2026-07-01T10:00:00Z",
  approved_at: driver.status === "approved" ? "2026-07-01T12:00:00Z" : null,
  profiles: {
    full_name: driver.profile.fullName,
    phone: driver.profile.phone
  }
}));

const mockAdminPayments = [
  {
    id: "payment-marcus",
    driver_id: "driver-marcus",
    amount_jmd: DRIVER_WEEKLY_PASS_JMD,
    method: "Cash payment to admin",
    reference_number: "LIN-1001",
    proof_url: null,
    note: "Weekly pass paid.",
    status: "approved",
    created_at: "2026-07-07T09:00:00Z",
    reviewed_at: "2026-07-07T09:20:00Z",
    drivers: { profiles: { full_name: "Marcus Brown", phone: "876-555-1001" }, plate_number: "PA 2847" }
  },
  {
    id: "payment-andre",
    driver_id: "driver-andre",
    amount_jmd: DRIVER_WEEKLY_PASS_JMD,
    method: "Bank transfer",
    reference_number: "LIN-1002",
    proof_url: null,
    note: "Weekly pass paid.",
    status: "approved",
    created_at: "2026-07-07T08:40:00Z",
    reviewed_at: "2026-07-07T09:05:00Z",
    drivers: { profiles: { full_name: "Andre", phone: "876-555-1002" }, plate_number: "PD 7431" }
  },
  {
    id: "payment-shawn",
    driver_id: "driver-shawn",
    amount_jmd: DRIVER_WEEKLY_PASS_JMD,
    method: "Lynk",
    reference_number: "LIN-1003",
    proof_url: null,
    note: "Paid, waiting on document approval.",
    status: "approved",
    created_at: "2026-07-06T18:30:00Z",
    reviewed_at: "2026-07-06T19:00:00Z",
    drivers: { profiles: { full_name: "Shawn", phone: "876-555-1003" }, plate_number: "PC 5282" }
  },
  {
    id: "payment-terry",
    driver_id: "driver-terry",
    amount_jmd: DRIVER_WEEKLY_PASS_JMD,
    method: "Cash payment to admin",
    reference_number: "LIN-1004",
    proof_url: null,
    note: "Needs approval before account becomes active again.",
    status: "pending",
    created_at: "2026-07-07T10:15:00Z",
    reviewed_at: null,
    drivers: { profiles: { full_name: "Terry", phone: "876-555-1004" }, plate_number: "PP 8102" }
  }
];

const mockAdminSubscriptions = mockDrivers.map((driver) => ({
  id: `subscription-${driver.id}`,
  driver_id: driver.id,
  amount_jmd: DRIVER_WEEKLY_PASS_JMD,
  status: driver.subscriptionStatus,
  starts_at: driver.subscriptionStatus === "active" ? "2026-07-07T09:00:00Z" : "2026-06-24T09:00:00Z",
  expires_at: driver.subscriptionExpiresAt || "2026-07-01T18:00:00Z",
  created_at: driver.subscriptionStatus === "active" ? "2026-07-07T09:00:00Z" : "2026-06-24T09:00:00Z",
  approved_at: driver.subscriptionStatus === "active" ? "2026-07-07T09:20:00Z" : "2026-06-24T09:20:00Z",
  drivers: { profiles: { full_name: driver.profile.fullName, phone: driver.profile.phone }, plate_number: driver.plateNumber }
}));

export const mockAdminDashboardData = {
  drivers: mockAdminDrivers,
  documents: [
    {
      id: "doc-marcus-license",
      driver_id: "driver-marcus",
      document_type: "driver_license",
      file_url: null,
      status: "approved",
      uploaded_at: "2026-07-01T10:30:00Z",
      drivers: { driver: { full_name: "Marcus Brown", phone: "876-555-1001" }, plate_number: "PA 2847", vehicle_make: "Toyota", vehicle_model: "Corolla" }
    },
    {
      id: "doc-shawn-license",
      driver_id: "driver-shawn",
      document_type: "driver_license",
      file_url: null,
      status: "pending",
      uploaded_at: "2026-07-07T09:10:00Z",
      drivers: { driver: { full_name: "Shawn", phone: "876-555-1003" }, plate_number: "PC 5282", vehicle_make: "Toyota", vehicle_model: "Axio" }
    }
  ],
  payments: mockAdminPayments,
  subscriptions: mockAdminSubscriptions,
  businesses: [],
  deliveries: [],
  support: [],
  rideRequests: mockRideRequests.map((request) => ({
    id: request.id,
    pickup_name: request.pickup.name,
    destination_name: request.destination.name,
    service_type: request.serviceType,
    vehicle_type: request.vehicleType,
    offered_fare_jmd: request.offeredFareJmd,
    status: request.status,
    created_at: "2026-07-07T08:00:00Z"
  })),
  locations: mockDrivers
    .filter((driver) => driver.subscriptionStatus === "active")
    .map((driver) => ({
      id: `location-${driver.id}`,
      driver_id: driver.id,
      lat: driver.lat,
      lng: driver.lng,
      is_online: true,
      updated_at: "2026-07-07T10:30:00Z",
      drivers: { profiles: { full_name: driver.profile.fullName }, plate_number: driver.plateNumber }
    }))
};
