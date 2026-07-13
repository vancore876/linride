import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  mockPointsRules,
  mockServiceAreas
} from "@/lib/mockData";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import { PointsRuleSettings } from "@/types/linride";

type AdminDashboardProps = {
  isAdmin: boolean;
  adminId?: string;
  data: {
    drivers: any[];
    documents: any[];
    payments: any[];
    subscriptions?: any[];
    businesses: any[];
    deliveries: any[];
    support: any[];
    rideRequests: any[];
    locations: any[];
    trips?: any[];
    passengerWithdrawals?: any[];
    driverWithdrawals?: any[];
    reports?: any[];
    auditLogs?: any[];
    ratings?: any[];
    pointsRules?: Partial<PointsRuleSettings> | null;
  } | null;
  onRefresh: () => void;
  onDriverStatus: (driverId: string, status: "approved" | "rejected" | "suspended" | "pending") => void;
  onDocumentReview: (documentId: string, driverId: string, status: "approved" | "rejected", reason?: string) => void;
  onDriverDocumentsStatus: (driverId: string, status: "approved" | "rejected", reason?: string) => void;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string, reason?: string) => void;
  onBusinessStatus: (businessId: string, status: "approved" | "rejected" | "suspended" | "pending") => void;
  onDeliveryStatus: (deliveryId: string, status: string) => void;
  onSupportStatus: (ticketId: string, status: string, note?: string) => void;
  onTripStatus?: (tripId: string, status: string, reason?: string) => void;
  onPassengerWithdrawal?: (requestId: string, status: "approved" | "rejected" | "paid", note?: string) => void;
  onDriverWithdrawal?: (requestId: string, status: "approved" | "rejected" | "paid", note?: string) => void;
  onReportStatus?: (reportId: string, status: "open" | "in_progress" | "resolved" | "closed", note?: string) => void;
  onPointsRules?: (rules: PointsRuleSettings) => void;
};

export function AdminDashboard({
  isAdmin,
  data,
  onRefresh,
  onDriverStatus,
  onDocumentReview,
  onDriverDocumentsStatus,
  onApprovePayment,
  onRejectPayment,
  onBusinessStatus,
  onDeliveryStatus,
  onSupportStatus,
  onTripStatus,
  onPassengerWithdrawal,
  onDriverWithdrawal,
  onReportStatus,
  onPointsRules
}: AdminDashboardProps) {
  const [reasonByDocument, setReasonByDocument] = useState<Record<string, string>>({});
  const [noteByItem, setNoteByItem] = useState<Record<string, string>>({});
  const [pointsRules, setPointsRules] = useState<PointsRuleSettings>(mockPointsRules);
  const drivers = data?.drivers || [];
  const payments = data?.payments || [];
  const subscriptions = data?.subscriptions || [];
  const passengerWithdrawals = data?.passengerWithdrawals || [];
  const driverWithdrawals = data?.driverWithdrawals || [];
  const reports = data?.reports || [];
  const auditLogs = data?.auditLogs || [];
  const trips = data?.trips || [];
  const now = new Date();
  const weeklyPassLabel = `$${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} JMD`;
  const paymentDueSoonMs = 2 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (data?.pointsRules) setPointsRules((current) => ({ ...current, ...data.pointsRules }));
  }, [data?.pointsRules]);

  const empty = (label: string) => <p className="linride-empty">No {label} right now.</p>;
  const pointFields: Array<[keyof PointsRuleSettings, string]> = [
    ["completedRide", "Ride"],
    ["completedDelivery", "Delivery"],
    ["completedErrand", "Errand"],
    ["completedScheduledRide", "Scheduled ride"],
    ["firstCompletedTripBonus", "First trip"],
    ["referralBonus", "Referral"],
    ["ratingBonus", "Rating"],
    ["minimumWithdrawalPoints", "Min withdrawal"],
    ["pointsToJmdRate", "Points to JMD"]
  ];

  function dateTime(value?: string | null) {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  }

  function getTime(value?: string | null) {
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function newestByDriver(rows: any[]) {
    return rows.reduce<Record<string, any>>((lookup, row) => {
      const driverId = row.driver_id;
      if (!driverId) return lookup;
      const current = lookup[driverId];
      if (!current || getTime(row.created_at || row.approved_at || row.reviewed_at) > getTime(current.created_at || current.approved_at || current.reviewed_at)) {
        lookup[driverId] = row;
      }
      return lookup;
    }, {});
  }

  const latestPaymentByDriver = newestByDriver(payments);
  const latestSubscriptionByDriver = newestByDriver(subscriptions);
  const driverAccounts = drivers.map((driver) => {
    const subscription = latestSubscriptionByDriver[driver.id];
    const latestPayment = latestPaymentByDriver[driver.id];
    const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
    const expiresAtTime = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.getTime() : 0;
    const hasActivePass =
      subscription?.status === "active" && (!expiresAt || (expiresAtTime > 0 && expiresAt > now));
    const driverApproved = driver.status === "approved";
    const documentsApproved = driver.documents_status === "approved";
    const accountActive = driverApproved && documentsApproved && hasActivePass;
    const msUntilDue = expiresAtTime ? expiresAtTime - now.getTime() : 0;
    const paymentStatus = hasActivePass
      ? `Paid until ${dateTime(subscription.expires_at)}`
      : latestPayment?.status === "pending"
        ? "Payment waiting for admin approval"
        : latestPayment?.status === "approved"
          ? "Payment expired"
          : "No active payment";
    const paymentDueText = hasActivePass
      ? msUntilDue <= paymentDueSoonMs
        ? `Payment due soon: ${weeklyPassLabel} by ${dateTime(subscription.expires_at)}`
        : `Next payment due: ${weeklyPassLabel} by ${dateTime(subscription.expires_at)}`
      : latestPayment?.status === "pending"
        ? `Payment submitted for ${weeklyPassLabel}. Waiting for admin approval.`
        : `Payment due now: ${weeklyPassLabel} weekly pass needed.`;
    const paymentDueClass = !hasActivePass
      ? "bg-ink text-white"
      : msUntilDue <= paymentDueSoonMs
        ? "bg-linred/20 text-linred"
        : "bg-smoke text-charcoal";
    const inactiveReason = !hasActivePass
      ? "No active account: driver has not paid or the weekly pass expired."
      : !driverApproved
        ? "Paid, but admin has not approved the driver account."
        : !documentsApproved
          ? "Paid, but driver documents are not approved."
          : "";

    return {
      driver,
      subscription,
      latestPayment,
      hasActivePass,
      accountActive,
      paymentStatus,
      paymentDueText,
      paymentDueClass,
      inactiveReason
    };
  });
  const paidDrivers = driverAccounts.filter((account) => account.hasActivePass).length;
  const activeDriverAccounts = driverAccounts.filter((account) => account.accountActive).length;
  const unpaidInactiveAccounts = driverAccounts.filter((account) => !account.hasActivePass).length;

  if (!isAdmin) {
    return (
      <section className="linride-screen">
        <div className="linride-card text-center">
          <h2 className="text-2xl font-black">Access denied.</h2>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="linride-screen">
        <div className="linride-card">
          <h2 className="text-2xl font-black">Loading admin dashboard...</h2>
          <p className="mt-2 text-sm font-semibold text-charcoal/60">Fetching protected Lin Ride records.</p>
          <button type="button" onClick={onRefresh} className="linride-submit mt-4">Retry</button>
        </div>
      </section>
    );
  }

  return (
    <div className="linride-screen space-y-4">
      <section className="linride-card-dark">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Admin Dashboard</p>
        <h2 className="mt-1 text-3xl font-black">Lin Ride control room</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/66">
          Review driver accounts, weekly payments, documents, business deliveries, withdrawals, support, points, and service areas.
        </p>
        <button type="button" onClick={onRefresh} className="linride-submit mt-4 max-w-xs">
          Refresh admin data
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Weekly fee", weeklyPassLabel],
          ["Active accounts", activeDriverAccounts],
          ["Paid drivers", paidDrivers],
          ["Unpaid inactive", unpaidInactiveAccounts],
          ["Pending drivers", drivers.filter((item) => item.status === "pending").length || 0],
          ["Documents", data?.documents.length || 0],
          ["Pending payments", payments.filter((item) => item.status === "pending").length || 0],
          ["Businesses", data?.businesses.filter((item) => item.status === "pending").length || 0],
          ["Ride requests", data?.rideRequests.length || 0],
          ["Live drivers", data?.locations.length || 0],
          ["Deliveries", data?.deliveries.length || 0],
          ["Support", data?.support.filter((item) => item.status !== "closed").length || 0]
        ].map(([label, value]) => (
          <div key={label} className="linride-card">
            <ShieldCheck size={18} className="mb-2 text-linred" />
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs font-bold text-charcoal/55">{label}</p>
          </div>
        ))}
      </section>

      <section className="admin-account-section">
        <div className="admin-account-heading">
          <div>
            <h3>Driver accounts</h3>
            <p>Approved driver + approved documents + active {weeklyPassLabel} pass = active account.</p>
          </div>
          <span>{activeDriverAccounts} active</span>
        </div>
        <div className="admin-account-list">
          {driverAccounts.length === 0 && empty("driver accounts")}
          {driverAccounts.map(({ driver, subscription, latestPayment, hasActivePass, accountActive, paymentDueText, inactiveReason }) => (
            <article key={driver.id} className="admin-account-row">
              <div className="admin-account-main">
                <div className="admin-account-person">
                  <strong>{driver.profiles?.full_name || "Driver"}</strong>
                  <small>{driver.plate_number || "No plate"} - {driver.profiles?.phone || "No phone"}</small>
                </div>
                <span className={`admin-account-state ${accountActive ? "active" : "inactive"}`}>
                  {accountActive ? "Active" : "Inactive"}
                </span>
                <div className="admin-account-flags">
                  <span>Driver <b>{driver.status}</b></span>
                  <span>Docs <b>{driver.documents_status}</b></span>
                  <span>Pass <b>{hasActivePass ? "paid" : "not paid"}</b></span>
                </div>
                <div className="admin-account-actions">
                  <button type="button" onClick={() => onDriverStatus(driver.id, "approved")} className="primary">
                    {driver.status === "approved" ? "Recheck" : driver.status === "suspended" ? "Reactivate" : "Approve"}
                  </button>
                  <button type="button" disabled={driver.status === "suspended"} onClick={() => onDriverStatus(driver.id, "suspended")}>Deactivate</button>
                </div>
              </div>

              {!accountActive && <p className="admin-account-reason">{inactiveReason || paymentDueText}</p>}

              {(driver.documents_status === "pending" || latestPayment?.status === "pending") && (
                <div className="admin-account-pending">
                  {driver.documents_status === "pending" && (
                    <div>
                      <span>Google Form waiting for review</span>
                      <input
                        placeholder="Rejection reason"
                        value={reasonByDocument[`driver-${driver.id}`] || ""}
                        onChange={(event) => setReasonByDocument((current) => ({ ...current, [`driver-${driver.id}`]: event.target.value }))}
                      />
                      <button type="button" className="primary" onClick={() => onDriverDocumentsStatus(driver.id, "approved")}>Approve documents</button>
                      <button type="button" onClick={() => onDriverDocumentsStatus(driver.id, "rejected", reasonByDocument[`driver-${driver.id}`])}>Reject</button>
                    </div>
                  )}
                  {latestPayment?.status === "pending" && (
                    <div>
                      <span>J${(latestPayment.amount_jmd || DRIVER_WEEKLY_PASS_JMD).toLocaleString()} payment waiting</span>
                      <button type="button" className="primary" onClick={() => onApprovePayment(latestPayment.id)}>Approve payment</button>
                      <button type="button" onClick={() => onRejectPayment(latestPayment.id)}>Reject</button>
                    </div>
                  )}
                </div>
              )}

              <details className="admin-account-details">
                <summary>Details</summary>
                <p>{driver.vehicle_color || ""} {driver.vehicle_make || "Vehicle"} {driver.vehicle_model || ""}</p>
                <p>Payment: {latestPayment?.status || "none"} - Ref {latestPayment?.reference_number || "N/A"}</p>
                <p>Pass expires: {subscription ? dateTime(subscription.expires_at) : "No active pass"}</p>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Driver Documents</h3>
        {data.documents.length === 0 && empty("driver documents")}
        {data?.documents.map((document) => (
          <article key={document.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{document.document_type}</p>
            <p className="text-sm font-semibold text-charcoal/60">{document.drivers?.driver?.full_name || "Driver"} - Status: {document.status}</p>
            {document.preview_url && <a className="mt-2 block text-sm font-black text-linred" href={document.preview_url} target="_blank" rel="noreferrer">Open private document</a>}
            <input
              className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Rejection reason"
              value={reasonByDocument[document.id] || ""}
              onChange={(event) => setReasonByDocument((current) => ({ ...current, [document.id]: event.target.value }))}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onDocumentReview(document.id, document.driver_id, "approved")} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">Approve document</button>
              <button onClick={() => onDocumentReview(document.id, document.driver_id, "rejected", reasonByDocument[document.id])} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white">Reject document</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Driver Pass Payments</h3>
        {data.payments.length === 0 && empty("driver pass payments")}
        {data?.payments.map((payment) => (
          <article key={payment.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{payment.drivers?.profiles?.full_name || "Driver payment"}</p>
            <p className="text-sm font-semibold text-charcoal/60">{payment.method} - Ref {payment.reference_number || "N/A"} - ${payment.amount_jmd} JMD</p>
            <p className="text-xs font-bold text-charcoal/55">Status: {payment.status} - Created: {payment.created_at ? new Date(payment.created_at).toLocaleString() : "N/A"}</p>
            {payment.note && <p className="mt-2 text-sm font-semibold text-charcoal/65">{payment.note}</p>}
            {payment.preview_url && <a className="mt-2 block text-sm font-black text-linred" href={payment.preview_url} target="_blank" rel="noreferrer">Open private proof</a>}
            <input
              className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Reason if rejecting"
              value={noteByItem[`payment-${payment.id}`] || ""}
              onChange={(event) => setNoteByItem((current) => ({ ...current, [`payment-${payment.id}`]: event.target.value }))}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onApprovePayment(payment.id)} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">Approve payment</button>
              <button onClick={() => onRejectPayment(payment.id, noteByItem[`payment-${payment.id}`] || "Payment proof rejected by admin.")} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white">Reject payment</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Businesses</h3>
        {data.businesses.length === 0 && empty("business accounts")}
        {data?.businesses.map((business) => (
          <article key={business.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{business.business_name}</p>
            <p className="text-sm font-semibold text-charcoal/60">{business.profiles?.full_name || "Owner"} - {business.business_type} - {business.phone}</p>
            <p className="text-sm font-semibold text-charcoal/60">{business.address || "No address"}</p>
            <p className="text-xs font-bold text-charcoal/55">Status: {business.status}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => onBusinessStatus(business.id, "approved")} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">Approve</button>
              <button onClick={() => onBusinessStatus(business.id, "rejected")} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white">Reject</button>
              <button onClick={() => onBusinessStatus(business.id, "suspended")} className="rounded-2xl bg-smoke px-3 py-2 text-xs font-black">Suspend</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Business Deliveries</h3>
        {data.deliveries.length === 0 && empty("business deliveries")}
        {data?.deliveries.map((delivery) => (
          <article key={delivery.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{delivery.pickup_business_name || delivery.business_accounts?.business_name}</p>
            <p className="text-sm font-semibold text-charcoal/60">{delivery.pickup_address} to {delivery.dropoff_address}</p>
            <p className="text-xs font-bold text-charcoal/55">Passenger: {delivery.customer_name} - {delivery.customer_phone}</p>
            <p className="mt-2 text-sm font-semibold text-charcoal/65">{delivery.package_details}</p>
            <p className="text-xs font-bold text-charcoal/55">
              Offer: ${delivery.delivery_offer_jmd || 0} JMD - Cash collection: {delivery.cash_collection_required ? `$${delivery.cash_collection_amount_jmd || 0} JMD` : "No"} - Driver: {delivery.accepted_driver_id || "None"}
            </p>
            <select value={delivery.status} onChange={(event) => onDeliveryStatus(delivery.id, event.target.value)} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm font-bold">
              {["searching", "accepted", "picking_up", "picked_up", "delivering", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Ride Requests</h3>
        {data.rideRequests.length === 0 && empty("ride requests")}
        {data?.rideRequests.map((request) => (
          <article key={request.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{request.pickup_name || "Pickup"} to {request.destination_name || "Destination"}</p>
            <p className="text-sm font-semibold text-charcoal/60">{request.service_type} - {request.vehicle_type} - ${request.offered_fare_jmd || 0} JMD</p>
            <p className="text-xs font-bold text-charcoal/55">Status: {request.status} - Created: {request.created_at ? new Date(request.created_at).toLocaleString() : "N/A"}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Trips</h3>
        {trips.length === 0 && empty("trips")}
        {trips.map((trip) => (
          <article key={trip.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{trip.ride_requests?.pickup_name || "Pickup"} to {trip.ride_requests?.destination_name || "Destination"}</p>
            <p className="text-sm font-semibold text-charcoal/60">
              Driver: {trip.drivers?.profiles?.full_name || trip.driver_id} - Plate {trip.drivers?.plate_number || "N/A"}
            </p>
            <p className="text-xs font-bold text-charcoal/55">Fare: J${Number(trip.agreed_fare_jmd || 0).toLocaleString()} - PIN verified: {trip.pin_verified ? "yes" : "no"}</p>
            <select value={trip.status} onChange={(event) => onTripStatus?.(trip.id, event.target.value, event.target.value === "cancelled" ? "Cancelled by admin." : undefined)} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm font-bold">
              {["driver_arriving", "arrived", "in_progress", "completed", "cancelled"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Live Drivers</h3>
        {data.locations.length === 0 && empty("live drivers")}
        {data?.locations.map((location) => (
          <article key={location.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{location.drivers?.profiles?.full_name || "Driver"} - {location.drivers?.plate_number || "No plate"}</p>
            <p className="text-sm font-semibold text-charcoal/60">Lat {location.lat}, Lng {location.lng}</p>
            <p className="text-xs font-bold text-charcoal/55">Last seen: {location.updated_at ? new Date(location.updated_at).toLocaleString() : "N/A"}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Support</h3>
        {data.support.length === 0 && empty("support tickets")}
        {data?.support.map((ticket) => (
          <article key={ticket.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{ticket.category}</p>
            <p className="text-sm font-semibold text-charcoal/60">{ticket.profiles?.full_name || "User"} - {ticket.message}</p>
            <p className="text-xs font-bold text-charcoal/55">Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "N/A"}</p>
            <textarea
              value={noteByItem[`support-${ticket.id}`] ?? ticket.admin_note ?? ""}
              onChange={(event) => setNoteByItem((current) => ({ ...current, [`support-${ticket.id}`]: event.target.value }))}
              className="linride-textarea mt-3"
              placeholder="Admin note visible to the user"
            />
            <select value={ticket.status} onChange={(event) => onSupportStatus(ticket.id, event.target.value, noteByItem[`support-${ticket.id}`] ?? ticket.admin_note)} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm font-bold">
              {["open", "in_progress", "resolved", "closed"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Points Management</h3>
        <article className="rounded-3xl bg-white p-4 shadow-soft">
          <p className="font-black">Reward rules</p>
          <p className="mt-1 text-sm font-semibold text-charcoal/60">
            Points are only awarded after legitimate completed activity. Cancelled, disputed, refunded, frozen, or under-review jobs should not be withdrawable.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pointFields.map(([key, label]) => (
              <label key={key} className="rounded-2xl bg-smoke px-3 py-2 text-xs font-black text-charcoal/65">
                {label}
                <input
                  type="number"
                  min={key === "pointsToJmdRate" ? 0.01 : 0}
                  step={key === "pointsToJmdRate" ? 0.01 : 1}
                  value={pointsRules[key]}
                  onChange={(event) => setPointsRules((current) => ({ ...current, [key]: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-2 py-2 text-sm font-black text-charcoal"
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => onPointsRules?.(pointsRules)} className="linride-submit mt-3">Save points rules</button>
        </article>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Passenger Withdrawals</h3>
        {passengerWithdrawals.length === 0 && empty("passenger withdrawal requests")}
        {passengerWithdrawals.map((withdrawal) => (
          <article key={withdrawal.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{withdrawal.profiles?.full_name || "Passenger"}</p>
            <p className="text-sm font-semibold text-charcoal/60">
              {Number(withdrawal.points || 0).toLocaleString()} points - {withdrawal.bank_name} - Account ending {String(withdrawal.account_number || "").slice(-4)}
            </p>
            <p className="text-xs font-bold text-charcoal/55">Status: {withdrawal.status} - Created: {dateTime(withdrawal.created_at)}</p>
            <input value={noteByItem[`passenger-withdrawal-${withdrawal.id}`] || ""} onChange={(event) => setNoteByItem((current) => ({ ...current, [`passenger-withdrawal-${withdrawal.id}`]: event.target.value }))} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm" placeholder="Admin note or rejection reason" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => onPassengerWithdrawal?.(withdrawal.id, "approved", noteByItem[`passenger-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">Approve</button>
              <button onClick={() => onPassengerWithdrawal?.(withdrawal.id, "rejected", noteByItem[`passenger-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white">Reject</button>
              <button onClick={() => onPassengerWithdrawal?.(withdrawal.id, "paid", noteByItem[`passenger-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-smoke px-3 py-2 text-xs font-black">Mark paid</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Driver Withdrawals</h3>
        {driverWithdrawals.length === 0 && empty("driver withdrawal requests")}
        {driverWithdrawals.map((withdrawal) => (
          <article key={withdrawal.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{withdrawal.drivers?.profiles?.full_name || "Driver"} - {withdrawal.drivers?.plate_number || "No plate"}</p>
            <p className="text-sm font-semibold text-charcoal/60">J${Number(withdrawal.amount_jmd || 0).toLocaleString()} - {withdrawal.bank_name} - Account ending {String(withdrawal.account_number || "").slice(-4)}</p>
            <p className="text-xs font-bold text-charcoal/55">Status: {withdrawal.status} - Created: {dateTime(withdrawal.created_at)}</p>
            <input value={noteByItem[`driver-withdrawal-${withdrawal.id}`] || ""} onChange={(event) => setNoteByItem((current) => ({ ...current, [`driver-withdrawal-${withdrawal.id}`]: event.target.value }))} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm" placeholder="Admin note or rejection reason" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => onDriverWithdrawal?.(withdrawal.id, "approved", noteByItem[`driver-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">Approve</button>
              <button onClick={() => onDriverWithdrawal?.(withdrawal.id, "rejected", noteByItem[`driver-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white">Reject</button>
              <button onClick={() => onDriverWithdrawal?.(withdrawal.id, "paid", noteByItem[`driver-withdrawal-${withdrawal.id}`])} className="rounded-2xl bg-smoke px-3 py-2 text-xs font-black">Mark paid</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Service Areas</h3>
        <article className="rounded-3xl bg-white p-4 shadow-soft">
          <p className="font-black">Country routes and districts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {mockServiceAreas.map((area) => (
              <span key={area} className="rounded-full bg-smoke px-3 py-2 text-xs font-black text-charcoal/65">
                {area}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Reports and Disputes</h3>
        {reports.length === 0 && empty("reports or disputes")}
        {reports.map((report) => (
          <article key={report.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{report.report_type?.replaceAll("_", " ") || "Trip issue"} - {report.reason}</p>
            <p className="text-sm font-semibold text-charcoal/60">Reporter: {report.profiles?.full_name || report.reporter_id}</p>
            {report.details && <p className="mt-2 text-sm font-semibold text-charcoal/70">{report.details}</p>}
            <textarea value={noteByItem[`report-${report.id}`] ?? report.admin_note ?? ""} onChange={(event) => setNoteByItem((current) => ({ ...current, [`report-${report.id}`]: event.target.value }))} className="linride-textarea mt-3" placeholder="Admin resolution note" />
            <select value={report.status} onChange={(event) => onReportStatus?.(report.id, event.target.value as "open" | "in_progress" | "resolved" | "closed", noteByItem[`report-${report.id}`] ?? report.admin_note)} className="mt-3 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm font-bold">
              {["open", "in_progress", "resolved", "closed"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black">Admin Audit Log</h3>
        {auditLogs.length === 0 && empty("admin audit entries")}
        {auditLogs.map((entry) => (
          <article key={entry.id} className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-black">{entry.action_type?.replaceAll("_", " ")}</p>
            <p className="text-sm font-semibold text-charcoal/60">{entry.target_table} - {entry.target_id || "settings"}</p>
            {entry.note && <p className="mt-1 text-sm font-semibold text-charcoal/70">{entry.note}</p>}
            <p className="mt-2 text-xs font-bold text-charcoal/50">{entry.profiles?.full_name || "Admin"} - {dateTime(entry.created_at)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
