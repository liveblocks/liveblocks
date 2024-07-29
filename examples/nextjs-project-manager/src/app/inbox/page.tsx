import { Room } from "@/app/Room";
import { Logo } from "@/components/Logo";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Inbox } from "@/components/Inbox";

export default function PageInbox() {
  return (
    <Room>
      <div className="flex flex-row h-full">
        <nav className="p-2 w-[250px]">
          <div>Liveblocks</div>
        </nav>
        <main className="m-2 border flex-grow bg-white rounded flex flex-row">
          <div className="border-r w-[400px]">
            <Inbox />
          </div>
          <div className="flex-grow">
            <Issue />
          </div>
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}
