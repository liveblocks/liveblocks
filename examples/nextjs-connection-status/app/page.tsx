import { Room } from "./Room";
import { LostConnectionToasts } from "@/components/LostConnectionToasts";
import { Status } from "@/components/Status";
import { LiveAvatars } from "@/components/LiveAvatars";

export default function Home() {
  return (
    <Room>
      <header>
        <Status />
        <LiveAvatars />
      </header>

      <p>
        Try putting your web browser in "offline mode" mode to simulate losing a
        connection. By default, Liveblocks automatically tries to reconnect
        after 5 seconds. You can override the <code>lostConnectionTimeout</code>{" "}
        in <code>createClient()</code>.
      </p>
      <LostConnectionToasts />
    </Room>
  );
}
