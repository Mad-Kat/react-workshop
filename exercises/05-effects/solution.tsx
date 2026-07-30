/**
 * Exercise 05: What Effects Are Actually For — SOLUTIONS
 * ========================================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useEffectEvent, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

interface Room {
  id: string;
  name: string;
  ratePerGuest: number;
  maxGuests: number;
  category: string;
}

const trackEvent = (event: string, data: Record<string, unknown>) => {
  console.log(`[Analytics] ${event}`, data);
};

const subscribeToLiveRateUpdates = (
  roomId: string,
  callback: (newScore: number) => void,
): (() => void) => {
  subscriptionsStarted += 1;
  notifyCounterListeners();
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 100));
  }, 5000);
  return () => clearInterval(interval);
};

// PROVIDED — subscription counter (same as exercise)
let subscriptionsStarted = 0;
const counterListeners = new Set<() => void>();
const notifyCounterListeners = () => counterListeners.forEach((l) => l());

const SubscriptionCount: FunctionComponent = () => {
  const [count, setCount] = useState(subscriptionsStarted);
  useEffect(() => {
    const listener = () => setCount(subscriptionsStarted);
    counterListeners.add(listener);
    return () => {
      counterListeners.delete(listener);
    };
  }, []);
  return (
    <span
      style={{
        background: count > 1 ? "#fce8e6" : "#e6f4ea",
        color: count > 1 ? "#c5221f" : "#137333",
        borderRadius: 4,
        padding: "2px 8px",
        fontWeight: 600,
        fontSize: 13,
        marginLeft: 8,
      }}
    >
      Subscriptions started: {count}
    </span>
  );
};

export const RoomBookingPanel: FunctionComponent<{
  room: Room;
  onConfirm?: (data: { roomId: string; guests: number; totalRate: number }) => void;
}> = ({
  room,
  onConfirm,
}) => {
  const renderCount = useRenderCount();

  const [guests, setGuests] = useState(1);
  const [liveRate, setLiveRate] = useState(room.ratePerGuest);

  // Effect A → DERIVATION: totalRate is computable from liveRate and guests.
  // No state, no effect needed. Just compute it inline.
  const totalRate = liveRate * guests;

  // Effect B → EVENT RESPONSE: the analytics call and the onConfirm callback
  // are responses to a user action. They belong at the call site (the click
  // handler), not in an effect watching a boolean flag.

  // Effect C → LEGITIMATE EFFECT: synchronizes with an external occupancy
  // score subscription. Keep it — but the analytics requirement ("report the
  // CURRENT guest count on every rate update") must not force re-subscription.
  //
  // useEffectEvent separates the two concerns:
  //   - The EFFECT synchronizes with the subscription → deps: [room.id]
  //   - The EVENT is what happens on each update → always sees latest state
  //
  // onRateUpdate is not reactive: it doesn't go in the dep array, and the
  // linter knows not to ask for it. It always reads the latest `guests`.
  // (Don't call it during render, and don't pass it to other components.)
  const onRateUpdate = useEffectEvent((newScore: number) => {
    setLiveRate(newScore);
    trackEvent("rate_update_seen", { roomId: room.id, guests });
  });

  useEffect(() => {
    const unsubscribe = subscribeToLiveRateUpdates(room.id, (newScore) => {
      onRateUpdate(newScore);
    });
    return unsubscribe;
  }, [room.id]);

  // Effect D → LEGITIMATE EFFECT: synchronizes with the browser keyboard API.
  // Correct — keep it.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGuests(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Everything that should happen on confirm goes in the handler.
  // The component doesn't need to know whether analytics is wired up
  // or what the parent does with onConfirm. It just calls them.
  const handleConfirmBooking = () => {
    const data = { roomId: room.id, guests, totalRate };
    trackEvent("booking_confirmed", data);
    onConfirm?.(data);
  };

  return (
    <div>
      <h1>Exercise 05 — {room.name}</h1>
      <p>Rate per guest: ${liveRate}</p>
      <p>
        Guests:
        <input
          type="number"
          value={guests}
          min={1}
          onChange={(e) => setGuests(Number(e.target.value))}
        />
      </p>
      <p>Total: ${totalRate}</p>
      <button onClick={handleConfirmBooking}>Confirm Booking</button>
      <p>
        <SubscriptionCount />
      </p>
      <RenderCount count={renderCount} />
    </div>
  );
};

/**
 * Real codebase reference:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: legitimate polling + visibility effects
 */
