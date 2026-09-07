/**
 * Exercise 05: What Effects Are Actually For
 * ============================================
 *
 * Mental model: An Effect synchronizes React with something EXTERNAL.
 * If there's no external system involved, it's not an effect.
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
// This component has FIVE useEffect calls. Not all of them should be effects.
//
// For each one, decide: is it a legitimate effect, or is it doing something
// that belongs elsewhere? Refactor the ones that shouldn't be effects.
//
// The last one is different. It IS a legitimate effect as it talks to an
// external system, but it still misbehaves. Change the guest count and
// watch "Availability subscriptions opened" climb.
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
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 100));
  }, 5000);
  return () => clearInterval(interval);
};

// Simulates a websocket that streams how many slots are left for a room.
// Opening one is expensive, so the wrapper displays a running count of how
// many have been opened — the render counter, but for the external system.
let opened = 0;
const openedListeners = new Set<() => void>();

export const getAvailabilityConnections = () => opened;
export const subscribeToAvailabilityConnections = (listener: () => void) => {
  openedListeners.add(listener);
  return () => {
    openedListeners.delete(listener);
  };
};

const subscribeToAvailability = (
  roomId: string,
  callback: (slotsLeft: number) => void,
): (() => void) => {
  opened += 1;
  console.log(`[Availability] opened connection #${opened} for ${roomId}`);
  openedListeners.forEach((listener) => listener());
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 6));
  }, 3000);
  return () => {
    console.log(`[Availability] closed connection for ${roomId}`);
    clearInterval(interval);
  };
};

export const RoomBookingPanel: FunctionComponent<{
  room: Room;
  onConfirm?: (data: { roomId: string; guests: number; totalRate: number }) => void;
}> = ({ room, onConfirm }) => {
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
  useEffect(() => {
    const unsubscribe = subscribeToLiveRateUpdates(room.id, (newScore) => {
      setLiveRate(newScore);
    });
    return unsubscribe;
  }, [room.id]);

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

  // Effect E
  // The connection only depends on the room. The warning only depends on the
  // guest count. Both are in the dependency array, so both re-open the socket.
  useEffect(() => {
    const unsubscribe = subscribeToAvailability(room.id, (slotsLeft) => {
      if (slotsLeft < guests) {
        trackEvent("room_too_small", { roomId: room.id, guests, slotsLeft });
      }
    });
    return unsubscribe;
  }, [room.id, guests]);

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
      <RenderCount count={renderCount} />
    </div>
  );
};
