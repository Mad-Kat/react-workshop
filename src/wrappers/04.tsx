import { RoomBookingPanel } from "../../exercises/04-effects/exercise.tsx";

const room = { id: "1", name: "Ocean Suite", ratePerGuest: 120, maxGuests: 4, category: "premium" };

export default function Wrapper() {
  return <RoomBookingPanel room={room} />;
}
