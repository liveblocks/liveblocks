import { Room } from "./Room";
import { LostConnectionToasts } from "@/app/LostConnectionToasts";

export default function Home() {
  return (
    <Room>
      <LostConnectionToasts />
    </Room>
  );
}
