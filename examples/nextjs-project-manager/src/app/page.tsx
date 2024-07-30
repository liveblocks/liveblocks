import { Room } from "@/app/Room";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Nav } from "@/components/Nav";
import { liveblocks } from "@/liveblocks.server.config";
import { RoomData } from "@liveblocks/node";

export default async function PageIssue() {
  const rooms = await liveblocks.getRooms();
  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded">
        {rooms.data.map((room) => (
          <Row key={room.id} room={room} />
        ))}
      </main>
    </div>
  );
}

async function Row({ room }: { room: RoomData }) {
  console.log(room);
  return <div></div>;
}
