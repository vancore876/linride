import { ExternalLink, FileText, IdCard } from "lucide-react";
import { DriverDocumentsStatus } from "@/types/linride";

type DriverDocumentUploadCardProps = {
  status: DriverDocumentsStatus;
  rejectionReason?: string;
  googleFormUrl?: string;
  onSubmitted?: () => void;
};

export function DriverDocumentUploadCard({ status, rejectionReason, googleFormUrl, onSubmitted }: DriverDocumentUploadCardProps) {
  const message = {
    missing: "Upload your documents before you can receive Lin Ride requests.",
    pending: "Your documents are being reviewed. You'll get access after approval.",
    approved: "Documents approved. Your driver profile is ready.",
    rejected: "Some documents were rejected. Please re-upload them."
  }[status];

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-linred">Driver documents</p>
          <h3 className="text-xl font-black">Approval required</h3>
          <p className="mt-1 text-sm font-semibold text-charcoal/58">{message}</p>
        </div>
        <IdCard size={25} />
      </div>
      {status === "rejected" && rejectionReason && (
        <p className="mb-3 rounded-2xl bg-linred/10 px-3 py-2 text-xs font-bold text-linred">{rejectionReason}</p>
      )}
      <div className="rounded-3xl bg-ink p-4 text-white">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-linred p-3 text-ink">
            <FileText size={19} />
          </span>
          <div>
            <p className="text-sm font-black">Google verification form</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/68">
              Use this form to send license images, vehicle papers, insurance, plate number, and contact details.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs font-bold text-white/72 sm:grid-cols-2">
          {["Driver photo", "Driver license", "Vehicle photo", "Vehicle papers", "Insurance", "Phone and address"].map((item) => (
            <span key={item} className="rounded-2xl bg-white/10 px-3 py-2">
              {item}
            </span>
          ))}
        </div>
        {googleFormUrl ? (
          <a
            href={googleFormUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-linred px-4 py-3 text-sm font-black text-ink"
          >
            Upload driver verification
            <ExternalLink size={17} />
          </a>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/10 px-3 py-3 text-xs font-bold leading-5 text-white/74">
            Add your Google Form link in settings to turn this button on.
          </p>
        )}
        {(status === "missing" || status === "rejected") && googleFormUrl && onSubmitted && (
          <button type="button" onClick={onSubmitted} className="mt-2 w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-black text-white">
            I submitted the Google Form
          </button>
        )}
      </div>
    </section>
  );
}
