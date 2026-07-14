"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Power, ShieldCheck } from "lucide-react";
import { BankWithdrawalCard } from "@/components/BankWithdrawalCard";
import { BusinessDeliveryPopup } from "@/components/BusinessDeliveryPopup";
import { BusinessDeliveryActiveCard } from "@/components/BusinessDeliveryActiveCard";
import { DriverActiveJobCard } from "@/components/DriverActiveJobCard";
import { DriverBadgeList } from "@/components/DriverBadgeList";
import { DriverDocumentUploadCard } from "@/components/DriverDocumentUploadCard";
import { DriverRequestCard } from "@/components/DriverRequestCard";
import { EarningsSummaryCard } from "@/components/EarningsSummaryCard";
import { SupportButton } from "@/components/SupportButton";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { WeeklyPassAgreement } from "@/components/WeeklyPassAgreement";
import { DRIVER_WEEKLY_PASS_JMD } from "@/lib/driverPricing";
import { mockDriverEarningsBalanceJmd, mockDriverWithdrawalRequests } from "@/lib/mockData";
import { useDriverLocationPublisher } from "@/hooks/useDriverLocationPublisher";
import { sendNotificationEvent } from "@/lib/notifications";
import {
  BusinessDelivery,
  Driver,
  DriverEarningsSummary,
  DriverSubscriptionStatus,
  RideRequest,
  SupportTicket,
  TripRecord,
  TripStatus,
  WithdrawalRequest
} from "@/types/linride";
import { WithdrawalFormValues } from "@/components/BankWithdrawalCard";

type DriverModeProps = {
  driver: Driver;
  requests: RideRequest[];
  subscriptionStatus: DriverSubscriptionStatus;
  online: boolean;
  onSubscriptionStatusChange: (status: DriverSubscriptionStatus) => void;
  onOnlineChange: (online: boolean) => void;
  onAcceptRequest?: (request: RideRequest) => void;
  onCounterRequest?: (request: RideRequest, fareJmd: number) => void;
  onIgnoreRequest?: (request: RideRequest) => void;
  backendDriverId?: string;
  onSubmitPaymentProof?: (driverId: string, proof: { method: string; referenceNumber: string; note: string; file?: File | null }) => void;
  onCreateSupportTicket?: (category: string, message: string) => Promise<void> | void;
  supportTickets?: SupportTicket[];
  googleVerificationFormUrl?: string;
  businessDelivery?: BusinessDelivery | null;
  activeBusinessDelivery?: BusinessDelivery | null;
  onAcceptBusinessDelivery?: () => void;
  onIgnoreBusinessDelivery?: () => void;
  onCounterBusinessDelivery?: (fareJmd: number) => void;
  onBusinessDeliveryProgress?: (status: BusinessDelivery["status"], reason?: string) => Promise<void> | void;
  onUploadBusinessProof?: (file: File) => Promise<void> | void;
  onDocumentsSubmitted?: () => void;
  activeTrip?: TripRecord | null;
  tripMessage?: string | null;
  tripBusy?: boolean;
  onTripStatusChange?: (status: TripStatus, reason?: string) => Promise<void> | void;
  onVerifyTripPin?: (pin: string) => Promise<void> | void;
  onUploadTripProof?: (file: File) => Promise<void> | void;
  ratedTrip?: boolean;
  onRateTrip?: (rating: number, comment: string, badges: string[]) => Promise<void> | void;
  onReportTrip?: (reason: string, details: string) => Promise<void> | void;
  earnings?: DriverEarningsSummary | null;
  withdrawalRequests?: WithdrawalRequest[];
  onRequestWithdrawal?: (request: WithdrawalFormValues) => Promise<void> | void;
};

export function DriverMode({
  driver,
  requests,
  subscriptionStatus,
  online,
  onSubscriptionStatusChange,
  onOnlineChange,
  onAcceptRequest,
  onCounterRequest,
  onIgnoreRequest,
  backendDriverId,
  onSubmitPaymentProof,
  onCreateSupportTicket,
  googleVerificationFormUrl,
  businessDelivery,
  activeBusinessDelivery,
  onAcceptBusinessDelivery,
  onIgnoreBusinessDelivery,
  onCounterBusinessDelivery,
  onBusinessDeliveryProgress,
  onUploadBusinessProof,
  onDocumentsSubmitted,
  activeTrip,
  tripMessage,
  tripBusy,
  onTripStatusChange,
  onVerifyTripPin,
  onUploadTripProof,
  ratedTrip,
  onRateTrip,
  onReportTrip,
  earnings,
  withdrawalRequests = mockDriverWithdrawalRequests,
  onRequestWithdrawal,
  supportTickets = []
}: DriverModeProps) {
  const approved = driver.status === "approved";
  const documentsApproved = driver.documentsStatus === "approved";
  const hasActivePass = subscriptionStatus === "active";
  const hasProfilePhoto = Boolean(driver.profile.avatarUrl);
  const canGoOnline = approved && documentsApproved && hasActivePass && hasProfilePhoto;
  const documentBlocked = !documentsApproved;
  const liveLocation = useDriverLocationPublisher(backendDriverId, online && canGoOnline);
  const [showPassAgreement, setShowPassAgreement] = useState(false);
  const [showPayment, setShowPayment] = useState(subscriptionStatus === "pending");

  useEffect(() => {
    if (["denied", "unavailable"].includes(liveLocation.status) && online) onOnlineChange(false);
  }, [liveLocation.status, onOnlineChange, online]);

  useEffect(() => {
    if (!online || liveLocation.status !== "tracking" || !liveLocation.lastPublishedAt) return;
    if (!activeTrip || activeTrip.status !== "driver_arriving") return;
    void sendNotificationEvent({ type: "driver_near", tripId: activeTrip.id });
  }, [activeTrip, liveLocation.lastPublishedAt, liveLocation.status, online]);

  useEffect(() => {
    if (subscriptionStatus === "pending") setShowPayment(true);
    if (subscriptionStatus === "active") {
      setShowPayment(false);
      setShowPassAgreement(false);
    }
  }, [subscriptionStatus]);

  return (
    <div className="linride-screen">
      <section className="linride-panel-grid">
        <div className="linride-card">
          <div className="driver-profile-header flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                {driver.profile.avatarUrl && <Image unoptimized width={56} height={56} src={driver.profile.avatarUrl} alt={`${driver.profile.fullName} profile`} className="h-14 w-14 rounded-full border-4 border-linred object-cover" />}
                <div className="min-w-0">
                  <p className="linride-eyebrow">Driver / Rider</p>
                  <h2 className="break-words text-3xl font-black">Welcome, {driver.profile.fullName}</h2>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-charcoal/62">
                {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel} - {driver.plateNumber}
              </p>
              <p className="mt-2 text-sm font-black text-charcoal">
                Phone: <span className="text-linred">{driver.profile.phone}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-charcoal/52">Passengers see this number only after you accept a ride.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (canGoOnline) {
                  onOnlineChange(!online);
                  return;
                }
                onOnlineChange(false);
                if (approved && documentsApproved && hasProfilePhoto && !hasActivePass) setShowPassAgreement(true);
              }}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${
                online ? "bg-linred text-ink" : "bg-ink text-white"
              }`}
            >
              <Power size={18} />
              {online ? "Online" : "Offline"}
            </button>
          </div>

          <div className="driver-status-grid">
            {[
              ["Documents", driver.documentsStatus],
              ["Account", approved ? "approved" : driver.status],
              ["Pass", hasActivePass ? "active" : subscriptionStatus]
            ].map(([label, value]) => (
              <div key={label} className="driver-status-card">
                <p className="driver-status-value">{value}</p>
                <p className="driver-status-label">{label}</p>
              </div>
            ))}
          </div>

          {!canGoOnline && (
            <p className="mt-4 rounded-2xl bg-linred/10 px-3 py-3 text-sm font-bold text-linred">
              {!hasProfilePhoto
                ? "Add a profile picture before you can go online."
                : documentBlocked
                ? driver.documentsStatus === "missing"
                  ? "Upload your documents before you can receive Lin Ride requests."
                  : driver.documentsStatus === "pending"
                    ? "Your documents are being reviewed. You'll get access after approval."
                    : "Some documents were rejected. Please re-upload them."
                : approved
                  ? `Your weekly Lin Ride driver pass has expired. Pay J$${DRIVER_WEEKLY_PASS_JMD.toLocaleString()} for 7 days to continue receiving ride requests.`
                  : "Admin approval is required before you can subscribe or go online."}
            </p>
          )}
          {canGoOnline && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/70">
              <ShieldCheck size={18} className="text-linred" />
              You are ready. Turn online on when you want to receive jobs.
            </p>
          )}
          {liveLocation.message && (
            <p className={`mt-3 text-xs font-bold ${liveLocation.status === "tracking" ? "text-charcoal/60" : "text-linred"}`}>
              {liveLocation.message}
            </p>
          )}
          <div className="mt-4">
            <DriverBadgeList badges={driver.badges} />
          </div>
        </div>

        <section className="linride-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3>Jobs near you</h3>
              <p className="linride-card-desc mb-0">Accept the fare, send your price, or skip it.</p>
            </div>
            <span className={`linride-status-badge ${online ? "linride-status-done" : "linride-status-pending"}`}>
              {online ? "Live" : "Preview"}
            </span>
          </div>
          <div className="space-y-3">
            {requests.length === 0 && <p className="linride-empty">No nearby jobs right now. Leave online on and check back soon.</p>}
            {requests.map((request) => (
              <DriverRequestCard
                key={request.id}
                request={request}
                canRespond={canGoOnline && online}
                onAccept={onAcceptRequest}
                onCounter={onCounterRequest}
                onIgnore={onIgnoreRequest}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="linride-panel-grid">
        <div className="space-y-4">
          {!documentsApproved && (
            <DriverDocumentUploadCard
              status={driver.documentsStatus}
              rejectionReason={driver.documentsRejectionReason}
              googleFormUrl={googleVerificationFormUrl}
              onSubmitted={onDocumentsSubmitted}
            />
          )}
          {documentsApproved && !hasActivePass && (showPayment || subscriptionStatus === "pending") && (
            <SubscriptionCard
              status={subscriptionStatus}
              onSubmitProof={(proof) => {
                if (backendDriverId) onSubmitPaymentProof?.(backendDriverId, proof);
                onSubscriptionStatusChange("pending");
              }}
            />
          )}
          <EarningsSummaryCard summary={earnings} passExpiresAt={driver.subscriptionExpiresAt} />
        </div>

        <div className="space-y-4">
          {activeBusinessDelivery && onBusinessDeliveryProgress && (
            <BusinessDeliveryActiveCard
              delivery={activeBusinessDelivery}
              busy={tripBusy}
              onProgress={onBusinessDeliveryProgress}
              onUploadProof={onUploadBusinessProof}
            />
          )}
          {canGoOnline && online && businessDelivery && !activeBusinessDelivery && (
            <BusinessDeliveryPopup
              delivery={businessDelivery}
              onAccept={onAcceptBusinessDelivery ?? (() => undefined)}
              onCounter={onCounterBusinessDelivery}
              onIgnore={onIgnoreBusinessDelivery ?? (() => undefined)}
            />
          )}
          <DriverActiveJobCard
            trip={activeTrip}
            busy={tripBusy}
            message={tripMessage}
            onStatusChange={onTripStatusChange}
            onVerifyPin={onVerifyTripPin}
            onUploadProof={onUploadTripProof}
            rated={ratedTrip}
            onRate={onRateTrip}
            onReport={onReportTrip}
          />
          <BankWithdrawalCard
            title="Withdraw driver earnings"
            balance={earnings?.platformPayoutAvailableJmd ?? mockDriverEarningsBalanceJmd}
            unitLabel="JMD"
            minimumAmount={1000}
            conversionHelp="Driver / rider earnings are separate from passenger reward points."
            requests={withdrawalRequests}
            onSubmit={onRequestWithdrawal}
          />
          <SupportButton tickets={supportTickets} onCreateTicket={onCreateSupportTicket} />
        </div>
      </section>
      {showPassAgreement && (
        <WeeklyPassAgreement
          onClose={() => setShowPassAgreement(false)}
          onAgree={() => {
            setShowPassAgreement(false);
            setShowPayment(true);
          }}
        />
      )}
    </div>
  );
}
