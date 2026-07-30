/**
 * Exercise 05: What Effects Are Actually For
 * ============================================
 *
 * Mental model: An Effect synchronizes React with something EXTERNAL.
 * If there's no external system involved, it's not an effect.
 *
 * If you get stuck, open guide.md for the decision tree.
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise: Room Booking Panel
//
// This component has FOUR useEffect calls. Not all of them should be effects.
//
// For each one, decide: is it a legitimate effect, or is it doing something
// that belongs elsewhere? Refactor the ones that shouldn't be effects.
//
// Effect C IS a legitimate effect — but it has a subtle problem of its own.
// Watch the "Subscriptions started" badge while changing the guest count.
//
// After refactoring, compare the RenderCount. Why did it decrease?
// ---------------------------------------------------------------------------

interface Room {
  id: string;
  name: string;
  ratePerGuest: number;
  maxGuests: number;
  category: string;
}

// Simulates analytics
const trackEvent = (event: string, data: Record<string, unknown>) => {
  console.log(`[Analytics] ${event}`, data);
};

// Simulates subscribing to live occupancy score updates
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

// ---------------------------------------------------------------------------
// PROVIDED — don't modify. Shows how often the live-rate subscription has
// been (re)started. A healthy component subscribes ONCE per room.
// ---------------------------------------------------------------------------
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
  const [confirmed, setConfirmed] = useState(false);

  // Effect A
  const [totalRate, setTotalRate] = useState(room.ratePerGuest * guests);
  useEffect(() => {
    setTotalRate(liveRate * guests);
  }, [liveRate, guests]);

  // Effect B
  useEffect(() => {
    if (confirmed) {
      trackEvent("booking_confirmed", {
        roomId: room.id,
        guests,
        totalRate,
      });
      onConfirm?.({ roomId: room.id, guests, totalRate });
      setConfirmed(false);
    }
  }, [confirmed, room.id, guests, totalRate, onConfirm]);

  // Effect C
  //
  // NEW REQUIREMENT: analytics wants to know the CURRENT guest count every
  // time a live rate update arrives. The quick fix below reads `guests` in
  // the callback and adds it to the deps — the linter is happy.
  // But watch the "Subscriptions started" badge while you change the guest
  // count. Every keystroke tears down the subscription and starts a new one
  // (which also resets the 5s interval, so the rate stops updating while
  // the user types).
  //
  // The effect should only re-subscribe when room.id changes — but the
  // callback should still see the latest `guests`. Removing `guests` from
  // the deps is NOT the fix: the callback would capture the first render's
  // value forever (a stale closure, see Exercise 01).
  useEffect(() => {
    const unsubscribe = subscribeToLiveRateUpdates(room.id, (newScore) => {
      setLiveRate(newScore);
      trackEvent("rate_update_seen", { roomId: room.id, guests });
    });
    return unsubscribe;
  }, [room.id, guests]);

  // Effect D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGuests(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleConfirmBooking = () => {
    setConfirmed(true);
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
