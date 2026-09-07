import { useState, useSyncExternalStore } from "react";
import {
  getAvailabilityConnections,
  RoomBookingPanel,
  subscribeToAvailabilityConnections,
} from "../../exercises/05-effects/exercise.tsx";

// Lives out here so the badge updates when the socket opens, not one render later.
function ConnectionCount() {
  const opened = useSyncExternalStore(
    subscribeToAvailabilityConnections,
    getAvailabilityConnections,
  );
  return (
    <p style={{ color: opened > 1 ? "#dc2626" : "#666" }}>
      Availability subscriptions opened: <strong>{opened}</strong>
    </p>
  );
}

const rooms = [
  { id: "1", name: "Ocean Suite", ratePerGuest: 120, maxGuests: 4, category: "premium" },
  {
    id: "2",
    name: "Surfer Suite",
    ratePerGuest: 200,
    maxGuests: 8,
    category: "standard",
  },
];

export default function Wrapper() {
  const [roomIndex, setRoomIndex] = useState(0);

  return (
    <>
      <button onClick={() => setRoomIndex((e) => ++e % rooms.length)}>Change room</button>
      <ConnectionCount />
      <RoomBookingPanel
        key={roomIndex}
        room={rooms[roomIndex]!}
        onConfirm={(p) => {
          alert(JSON.stringify(p));
        }}
      />
    </>
  );
}
