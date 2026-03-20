/**
 * Exercise 04: What Effects Are Actually For
 * ============================================
 *
 * FRAMING — React's Reactivity Model
 *
 * Unlike Solid, Svelte, or Vue — which track dependencies at the signal level —
 * React tracks at the component level. When any state changes, the ENTIRE
 * component function re-runs. This is "coarse-grained reactivity."
 *
 * This means:
 *   - Anything you can derive from state/props is FREE to compute during render
 *   - Effects are escape hatches for synchronizing with EXTERNAL systems
 *   - If you can express something as a derivation or event response, it's not an effect
 *
 * Reference: https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity (for contrast)
 *
 * ----
 *
 * Mental model: An Effect is "code that keeps React synchronized with
 * something external." Two things that are NOT effects:
 *   - Data transformation → derive during render
 *   - User event responses → put in the event handler
 *
 * Classify each effect below: derivation, event handler, or legitimate effect.
 * Then refactor the non-effects.
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect
 *
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise: Room Booking Panel
//
// This component has FOUR effects. Classify each one:
//   A) Should be a derivation (compute during render)
//   B) Should be in an event handler
//   C) Legitimate effect (external system sync)
//   D) Legitimate effect (external system sync)
//
// Then refactor A and B.
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
const subscribeToOccupancyUpdates = (
  roomId: string,
  callback: (newScore: number) => void,
): (() => void) => {
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 100));
  }, 5000);
  return () => clearInterval(interval);
};

export const RoomBookingPanel: FunctionComponent<{ room: Room }> = ({
  room,
}) => {
  const [guests, setGuests] = useState(1);
  const [liveScore, setLiveScore] = useState(room.ratePerGuest);
  const [confirmed, setConfirmed] = useState(false);

  // Effect A: Computes total rate from rate and guest count
  // Is this a derivation, event handler, or legitimate effect?
  const [totalRate, setTotalRate] = useState(room.ratePerGuest * guests);
  useEffect(() => {
    setTotalRate(liveScore * guests);
  }, [liveScore, guests]);

  // Effect B: Sends analytics when user confirms the booking
  // Is this a derivation, event handler, or legitimate effect?
  useEffect(() => {
    if (confirmed) {
      trackEvent("booking_confirmed", {
        roomId: room.id,
        guests,
        totalRate,
      });
      setConfirmed(false);
    }
  }, [confirmed, room.id, guests, totalRate]);

  // Effect C: Subscribes to live occupancy score updates via WebSocket
  // Is this a derivation, event handler, or legitimate effect?
  useEffect(() => {
    const unsubscribe = subscribeToOccupancyUpdates(room.id, (newScore) => {
      setLiveScore(newScore);
    });
    return unsubscribe;
  }, [room.id]);

  // Effect D: Listens for keyboard shortcut (Escape to reset guest count)
  // Is this a derivation, event handler, or legitimate effect?
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
      <h1>Exercise 04 — {room.name}</h1>
      <p>Rate per guest: ${liveScore}</p>
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
    </div>
  );
};
