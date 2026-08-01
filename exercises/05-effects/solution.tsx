/**
 * Exercise 05: What Effects Are Actually For — SOLUTIONS
 * ========================================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
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
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 100));
  }, 5000);
  return () => clearInterval(interval);
};

export const RoomBookingPanel: FunctionComponent<{
  room: Room;
  onConfirm?: (data: { roomId: string; guests: number; totalRate: number }) => void;
}> = ({ room, onConfirm }) => {
  const renderCount = useRenderCount();

  const [guests, setGuests] = useState(1);
  const [liveRate, setLiveRate] = useState(room.ratePerGuest);

  // Effect A → DERIVATION: totalRate is computable from liveRate and guests.
  // No state, no effect needed. Just compute it inline.
  const totalRate = liveRate * guests;

  // Effect B → EVENT RESPONSE: the analytics call and the onConfirm callback
  // are responses to a user action. They belong at the call site (the click
  // handler), not in an effect watching a boolean flag.

  // Effect C → LEGITIMATE EFFECT: synchronizes with an external occupancy score subscription.
  useEffect(() => {
    const unsubscribe = subscribeToLiveRateUpdates(room.id, (newScore) => {
      setLiveRate(newScore);
    });
    return unsubscribe;
  }, [room.id]);

  // Effect D → LEGITIMATE EFFECT: synchronizes with the browser keyboard API.
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
      <RenderCount count={renderCount} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Key takeaway
//   An effect is for synchronizing with something outside React.
//   If the value is computable from what you already have, derive it during
//   render. If it happens because the user did something, put it in the handler.
// ---------------------------------------------------------------------------
