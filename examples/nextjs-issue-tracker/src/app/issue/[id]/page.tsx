import { Room } from "@/app/Room";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Nav } from "@/components/Nav";
import { Inbox } from "@/components/Inbox";
import { DisplayWhenInboxOpen } from "@/components/InboxContext";

export const revalidate = 0;

export default async function PageHome({
  params: { id },
}: {
  params: { id: string };
}) {
  return (
    <Room issueId={id}>
      <div className="flex flex-row h-full">
        <nav className="p-2 w-[200px] xl:w-[250px]">
          <Nav />
        </nav>
        <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
          <DisplayWhenInboxOpen>
            <div className="border-r w-[200px] xl:w-[300px]">
              <Inbox />
            </div>
          </DisplayWhenInboxOpen>
          <div className="flex-grow">
            <Issue issueId={id} />
          </div>
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}
