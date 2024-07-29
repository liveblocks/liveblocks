import { Room } from "@/app/Room";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Inbox } from "@/components/Inbox";
import { Nav } from "@/components/Nav";

export default function PageHome() {
  return (
    <Room>
      <div className="flex flex-row h-full">
        <nav className="p-2 w-[250px]">
          <Nav />
        </nav>
        <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
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
