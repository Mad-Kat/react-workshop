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
  const interval = setInterval(() => {
    callback(Math.floor(Math.random() * 100));
  }, 5000);
  return () => clearInterval(interval);
};

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

  // Effect E → LEGITIMATE EFFECT with a reactivity problem.
  //
  // The effect had two dependencies doing two different jobs. `room.id` decides
  // WHICH socket to open — genuinely reactive, a change means reconnect.
  // `guests` was only ever READ when a message arrived; it never described the
  // connection. Listing it forced a reconnect on every keystroke.
  //
  // useEffectEvent splits those apart. The event always sees the latest guests
  // without being reactive, so it does NOT go in the dependency array — that's
  // the rule, and it's the whole point.
  const onSlotsChanged = useEffectEvent((slotsLeft: number) => {
    if (slotsLeft < guests) {
      trackEvent("room_too_small", { roomId: room.id, guests, slotsLeft });
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeToAvailability(room.id, onSlotsChanged);
    return unsubscribe;
  }, [room.id]);

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
//   If the effect only READS a value rather than reacting to it, wrap that part
//   in useEffectEvent and keep it out of the dependency array.
// ---------------------------------------------------------------------------
