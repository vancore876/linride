"use client";

import { useState } from "react";
import { Headphones, Send } from "lucide-react";
import { SupportTicket } from "@/types/linride";

type SupportButtonProps = {
  tickets?: SupportTicket[];
  onCreateTicket?: (category: string, message: string) => Promise<void> | void;
};

const categories = [
  "Safety issue",
  "Payment issue",
  "Driver pass issue",
  "Trip issue",
  "Business delivery issue",
  "App issue",
  "Other"
];

export function SupportButton({ tickets = [], onCreateTicket }: SupportButtonProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submitTicket() {
    if (message.trim().length < 5) return;
    setBusy(true);
    setNotice(null);
    try {
      await onCreateTicket?.(category, message.trim());
      setMessage("");
      setNotice("Support ticket opened.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Support ticket could not be created. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="linride-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Headphones className="text-linred" />
          <div>
            <h3 className="text-lg font-black">Local support</h3>
            <p className="text-xs font-bold text-charcoal/55">Send a message and track the reply here.</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-2xl bg-linred px-3 py-2 text-xs font-black text-ink">
          {open ? "Close" : "Get help"}
        </button>
      </div>

      {open && (
        <div className="mt-4 grid gap-2">
          <label className="text-xs font-black uppercase text-charcoal/55" htmlFor="support-category">Category</label>
          <select id="support-category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-bold">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="text-xs font-black uppercase text-charcoal/55" htmlFor="support-message">What happened?</label>
          <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} className="linride-textarea" placeholder="Add enough detail so support can help" />
          <button type="button" disabled={busy || message.trim().length < 5} onClick={() => void submitTicket()} className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-3 text-sm font-black text-white disabled:opacity-40">
            <Send size={16} />
            {busy ? "Sending..." : "Open support ticket"}
          </button>
        </div>
      )}

      {notice && <p className="mt-3 rounded-2xl bg-linred/10 px-3 py-2 text-sm font-bold text-charcoal">{notice}</p>}

      <details className="mt-4 border-t border-black/10 pt-3">
        <summary className="cursor-pointer text-sm font-black">Ticket history ({tickets.length})</summary>
        <div className="mt-2 space-y-2">
          {tickets.length === 0 && <p className="rounded-2xl bg-smoke px-3 py-3 text-sm font-bold text-charcoal/55">No support tickets yet.</p>}
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl bg-smoke px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">{ticket.category}</p>
                  <p className="mt-1 text-xs font-semibold text-charcoal/65">{ticket.message}</p>
                </div>
                <span className="linride-status-badge linride-status-pending">{ticket.status.replace("_", " ")}</span>
              </div>
              {ticket.adminNote && <p className="mt-2 rounded-xl bg-white px-2 py-2 text-xs font-bold text-charcoal/65">Support: {ticket.adminNote}</p>}
              <p className="mt-2 text-[11px] font-bold text-charcoal/45">{new Date(ticket.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
