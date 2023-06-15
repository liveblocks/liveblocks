import { Room } from "./Room";
import { LostConnectionToasts } from "../components/LostConnectionToasts";
import { Status } from "@/components/Status";

export default function Home() {
  return (
    <Room>
      <div>
        Try putting your web browser in "offline mode" mode to simulate losing a
        connection.
      </div>
      <Status />
      <LostConnectionToasts />
    </Room>
  );
}
