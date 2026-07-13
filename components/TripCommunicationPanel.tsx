"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, MessageCircle, Mic, MicOff, Phone, PhoneOff, Send, X } from "lucide-react";
import {
  sendTripCallSignal,
  sendTripMessage,
  subscribeToTripCallSignals,
  subscribeToTripMessages
} from "@/lib/backend";
import { sendNotificationEvent, showAppNotification } from "@/lib/notifications";
import { TripCallSignal, TripMessage } from "@/types/linride";

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "connected";

type TripCommunicationPanelProps = {
  tripId: string;
  currentUserId: string;
  counterpartUserId: string;
  counterpartName: string;
  counterpartAvatarUrl?: string;
};

function sessionDescription(value: unknown): RTCSessionDescriptionInit | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const description = value as { type?: unknown; sdp?: unknown };
  if (!["offer", "answer", "pranswer", "rollback"].includes(String(description.type))) return null;
  return { type: description.type as RTCSdpType, sdp: typeof description.sdp === "string" ? description.sdp : undefined };
}

function iceCandidate(value: unknown): RTCIceCandidateInit | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as RTCIceCandidateInit;
  return typeof candidate.candidate === "string" ? candidate : null;
}

export function TripCommunicationPanel({
  tripId,
  currentUserId,
  counterpartUserId,
  counterpartName,
  counterpartAvatarUrl
}: TripCommunicationPanelProps) {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [muted, setMuted] = useState(false);

  const chatOpenRef = useRef(chatOpen);
  const messagesRef = useRef<TripMessage[]>([]);
  const messagesLoadedRef = useRef(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const outgoingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const signalingReadyRef = useRef(false);

  const updateCallState = useCallback((next: CallState) => {
    callStateRef.current = next;
    setCallState(next);
  }, []);

  const cleanUpCall = useCallback((notice?: string) => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    callIdRef.current = null;
    incomingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    outgoingCandidatesRef.current = [];
    signalingReadyRef.current = false;
    setMuted(false);
    setCallBusy(false);
    updateCallState("idle");
    if (notice) setCallNotice(notice);
  }, [updateCallState]);

  const createPeer = useCallback((callId: string) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }]
    });
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      if (!signalingReadyRef.current) {
        outgoingCandidatesRef.current.push(candidate);
        return;
      }
      void sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: "ice",
        payload: { candidate }
      }).catch(() => setCallNotice("The audio connection is unstable."));
    };
    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => undefined);
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        updateCallState("connected");
        setCallNotice("Audio call connected.");
      } else if (peer.connectionState === "connecting") {
        updateCallState("connecting");
      } else if (peer.connectionState === "failed") {
        cleanUpCall("The audio call could not connect. Try again.");
      }
    };
    peerRef.current = peer;
    return peer;
  }, [cleanUpCall, counterpartUserId, currentUserId, tripId, updateCallState]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    messagesRef.current = [];
    messagesLoadedRef.current = false;
    setMessages([]);
    return subscribeToTripMessages(
      tripId,
      (nextMessages) => {
        const known = new Set(messagesRef.current.map((message) => message.id));
        const incoming = nextMessages.filter((message) => message.senderId !== currentUserId && !known.has(message.id));
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        if (messagesLoadedRef.current && incoming.length) {
          if (!chatOpenRef.current) setUnread((current) => current + incoming.length);
          if (!chatOpenRef.current || document.visibilityState !== "visible") {
            const latest = incoming[incoming.length - 1];
            void showAppNotification(`Message from ${counterpartName}`, {
              body: latest.body,
              tag: `trip-message-${latest.id}`
            });
          }
        }
        messagesLoadedRef.current = true;
      },
      () => setMessageError("Messages could not be refreshed. Check your internet.")
    );
  }, [counterpartName, currentUserId, tripId]);

  useEffect(() => {
    if (chatOpen) messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatOpen, messages]);

  useEffect(() => {
    async function handleSignal(signal: TripCallSignal) {
      if (signal.senderId === currentUserId || signal.recipientId !== currentUserId) return;
      if (signal.signalType === "offer") {
        if (Date.now() - new Date(signal.createdAt).getTime() > 60_000) return;
        const offer = sessionDescription(signal.payload.description);
        if (!offer) return;
        if (callStateRef.current !== "idle") {
          await sendTripCallSignal({
            callId: signal.callId,
            tripId,
            senderId: currentUserId,
            recipientId: counterpartUserId,
            signalType: "decline"
          }).catch(() => undefined);
          return;
        }
        callIdRef.current = signal.callId;
        incomingOfferRef.current = offer;
        signalingReadyRef.current = true;
        updateCallState("incoming");
        setCallNotice(`${counterpartName} is calling.`);
        if (document.visibilityState !== "visible") {
          void showAppNotification("Incoming Lin Ride audio call", {
            body: `${counterpartName} is calling through Lin Ride.`,
            tag: `trip-call-${signal.id}`
          });
        }
        return;
      }
      if (signal.callId !== callIdRef.current) return;
      if (signal.signalType === "answer") {
        const answer = sessionDescription(signal.payload.description);
        if (!answer || !peerRef.current) return;
        await peerRef.current.setRemoteDescription(answer);
        const candidates = pendingCandidatesRef.current.splice(0);
        await Promise.all(candidates.map((candidate) => peerRef.current?.addIceCandidate(candidate)));
        updateCallState("connecting");
      } else if (signal.signalType === "ice") {
        const candidate = iceCandidate(signal.payload.candidate);
        if (!candidate) return;
        if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(candidate);
        else pendingCandidatesRef.current.push(candidate);
      } else if (signal.signalType === "decline") {
        cleanUpCall(`${counterpartName} could not take the call.`);
      } else if (signal.signalType === "hangup") {
        cleanUpCall("Audio call ended.");
      }
    }

    return subscribeToTripCallSignals(
      tripId,
      (signal) => void handleSignal(signal).catch(() => cleanUpCall("The audio call was interrupted.")),
      () => setCallNotice("Could not connect to audio calling. Check your internet.")
    );
  }, [cleanUpCall, counterpartName, counterpartUserId, currentUserId, tripId, updateCallState]);

  useEffect(() => {
    if (callState !== "incoming" && callState !== "outgoing") return;
    const callId = callIdRef.current;
    const timeout = window.setTimeout(() => {
      if (!callId || callIdRef.current !== callId) return;
      void sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: callState === "incoming" ? "decline" : "hangup"
      }).catch(() => undefined);
      cleanUpCall(callState === "incoming" ? "Missed audio call." : "No answer. Try again later.");
    }, 45_000);
    return () => window.clearTimeout(timeout);
  }, [callState, cleanUpCall, counterpartUserId, currentUserId, tripId]);

  useEffect(() => () => cleanUpCall(), [cleanUpCall]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!messageText.trim() || messageBusy) return;
    setMessageBusy(true);
    setMessageError(null);
    try {
      const sent = await sendTripMessage({ tripId, senderId: currentUserId, body: messageText });
      setMessageText("");
      const merged = [...messagesRef.current.filter((message) => message.id !== sent.id), sent]
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      messagesRef.current = merged;
      setMessages(merged);
      void sendNotificationEvent({ type: "message", messageId: sent.id });
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function startCall() {
    if (!("RTCPeerConnection" in window) || !navigator.mediaDevices?.getUserMedia) {
      setCallNotice("Audio calling is not supported by this browser.");
      return;
    }
    setCallBusy(true);
    setCallNotice("Requesting microphone access...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      localStreamRef.current = stream;
      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      updateCallState("outgoing");
      const peer = createPeer(callId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const signal = await sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: "offer",
        payload: { description: offer }
      });
      signalingReadyRef.current = true;
      const candidates = outgoingCandidatesRef.current.splice(0);
      void Promise.all(candidates.map((candidate) => sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: "ice",
        payload: { candidate }
      }))).catch(() => setCallNotice("The audio connection is unstable."));
      setCallNotice(`Calling ${counterpartName}...`);
      void sendNotificationEvent({ type: "call", signalId: signal.id });
    } catch (error) {
      cleanUpCall(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access is required for an in-app audio call."
        : "The audio call could not start. Try again.");
    } finally {
      setCallBusy(false);
    }
  }

  async function acceptCall() {
    const callId = callIdRef.current;
    const offer = incomingOfferRef.current;
    if (!callId || !offer) return;
    setCallBusy(true);
    setCallNotice("Connecting audio...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      localStreamRef.current = stream;
      const peer = createPeer(callId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(offer);
      const candidates = pendingCandidatesRef.current.splice(0);
      await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate)));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: "answer",
        payload: { description: answer }
      });
      updateCallState("connecting");
    } catch (error) {
      void sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType: "decline"
      }).catch(() => undefined);
      cleanUpCall(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access is required to answer."
        : "The audio call could not connect.");
    } finally {
      setCallBusy(false);
    }
  }

  async function endCall(signalType: "decline" | "hangup") {
    const callId = callIdRef.current;
    if (callId) {
      await sendTripCallSignal({
        callId,
        tripId,
        senderId: currentUserId,
        recipientId: counterpartUserId,
        signalType
      }).catch(() => undefined);
    }
    cleanUpCall(signalType === "decline" ? "Call declined." : "Audio call ended.");
  }

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  return (
    <section className="linride-card mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {counterpartAvatarUrl ? (
            <Image unoptimized width={44} height={44} src={counterpartAvatarUrl} alt={`${counterpartName} profile`} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-white">{counterpartName.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-linred">Current trip contact</p>
            <h2 className="truncate text-lg font-black text-charcoal">{counterpartName}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChatOpen((current) => !current)}
            className="relative flex items-center gap-2 rounded-2xl bg-smoke px-3 py-3 text-xs font-black text-charcoal"
          >
            <MessageCircle size={17} />
            Message
            {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-linred px-1 text-[10px] text-ink">{unread}</span>}
          </button>
          {callState === "idle" ? (
            <button type="button" disabled={callBusy} onClick={() => void startCall()} className="flex items-center gap-2 rounded-2xl bg-linred px-3 py-3 text-xs font-black text-ink disabled:opacity-50">
              {callBusy ? <LoaderCircle className="animate-spin" size={17} /> : <Phone size={17} />}
              Audio call
            </button>
          ) : (
            <button type="button" onClick={() => void endCall(callState === "incoming" ? "decline" : "hangup")} className="flex items-center gap-2 rounded-2xl bg-ink px-3 py-3 text-xs font-black text-white">
              <PhoneOff size={17} />
              {callState === "incoming" ? "Decline" : "Hang up"}
            </button>
          )}
        </div>
      </div>

      {callState !== "idle" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-3 py-3 text-white" aria-live="polite">
          <div>
            <p className="text-sm font-black">
              {callState === "incoming" ? `Incoming call from ${counterpartName}` : callState === "connected" ? `On call with ${counterpartName}` : `Connecting to ${counterpartName}`}
            </p>
            <p className="mt-1 text-xs font-bold text-white/65">Audio only</p>
          </div>
          <div className="flex gap-2">
            {callState === "incoming" && (
              <button type="button" disabled={callBusy} onClick={() => void acceptCall()} className="flex items-center gap-2 rounded-xl bg-linred px-3 py-2 text-xs font-black text-ink disabled:opacity-50">
                <Check size={16} /> Accept
              </button>
            )}
            {callState === "connected" && (
              <button type="button" onClick={toggleMute} className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-xs font-black text-white">
                {muted ? <MicOff size={16} /> : <Mic size={16} />} {muted ? "Unmute" : "Mute"}
              </button>
            )}
            <button type="button" onClick={() => void endCall(callState === "incoming" ? "decline" : "hangup")} className="grid h-9 w-9 place-items-center rounded-xl bg-white/12" aria-label="End audio call">
              {callState === "incoming" ? <X size={17} /> : <PhoneOff size={17} />}
            </button>
          </div>
        </div>
      )}
      {callNotice && <p className="mt-2 text-xs font-bold text-charcoal/60" aria-live="polite">{callNotice}</p>}
      <audio ref={remoteAudioRef} autoPlay />

      {chatOpen && (
        <div className="mt-4 border-t border-black/10 pt-4">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-live="polite">
            {messages.length === 0 && <p className="rounded-2xl bg-smoke px-3 py-4 text-center text-xs font-bold text-charcoal/55">No messages yet. Say hello to coordinate the pickup.</p>}
            {messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm font-semibold ${mine ? "bg-linred text-ink" : "bg-smoke text-charcoal"}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-[10px] font-black ${mine ? "text-ink/55" : "text-charcoal/45"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
          <form onSubmit={submitMessage} className="mt-3 flex gap-2">
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={1000}
              className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-smoke px-3 py-3 text-sm font-bold text-charcoal outline-none focus:border-linred"
              placeholder={`Message ${counterpartName}`}
              aria-label={`Message ${counterpartName}`}
            />
            <button type="submit" disabled={messageBusy || !messageText.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linred text-ink disabled:opacity-45" aria-label="Send message">
              {messageBusy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
          {messageError && <p className="mt-2 text-xs font-black text-linred">{messageError}</p>}
        </div>
      )}
    </section>
  );
}
