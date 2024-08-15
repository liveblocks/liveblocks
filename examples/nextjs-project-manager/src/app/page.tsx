import { Nav } from "@/components/Nav";
import { liveblocks } from "@/liveblocks.server.config";
import { RoomWithMetadata } from "@/config";
import { IssuesList } from "@/components/IssuesList";

export const revalidate = 0;

export default async function PageIssue() {
  const rooms = (await liveblocks.getRooms()).data as RoomWithMetadata[];
  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[200px] xl:w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded">
        <IssuesList initialRooms={rooms} />
      </main>
    </div>
  );
}
