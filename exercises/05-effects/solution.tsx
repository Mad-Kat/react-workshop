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
  const renderCount = useRenderCount();

  const [guests, setGuests] = useState(1);
  const [liveScore, setLiveScore] = useState(room.ratePerGuest);

  // Effect A → DERIVATION: totalRate is computable from liveScore and guests.
  // No state, no effect needed. Just compute it inline.
  const totalRate = liveScore * guests;

  // Effect B → EVENT HANDLER: analytics should fire when the user clicks
  // "Confirm Booking", not when a `confirmed` flag changes. Move it to the
  // click handler directly.

  // Effect C → LEGITIMATE EFFECT: synchronizes with an external occupancy
  // score subscription. Correct — keep it.
  useEffect(() => {
    const unsubscribe = subscribeToOccupancyUpdates(room.id, (newScore) => {
      setLiveScore(newScore);
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

  // Analytics moved to the click handler — no intermediate state needed
  const handleConfirmBooking = () => {
    trackEvent("booking_confirmed", {
      roomId: room.id,
      guests,
      totalRate,
    });
    // ... actual booking confirmation logic
  };

  return (
    <div>
      <h1>Exercise 05 — {room.name}</h1>
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
      <RenderCount count={renderCount} />
    </div>
  );
};

/**
 * Real codebase reference:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: legitimate polling + visibility effects
 */
