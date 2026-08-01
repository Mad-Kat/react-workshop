import { useState } from "react";
import { RoomBookingPanel } from "../../exercises/05-effects/exercise.tsx";

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
