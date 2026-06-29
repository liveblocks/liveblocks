import { Suspense } from "react";
import { Room } from "@/app/Room";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Nav } from "@/components/Nav";
import { Inbox } from "@/components/Inbox";
import { DisplayWhenInboxOpen } from "@/components/InboxContext";
import { IssueShell } from "@/components/IssueShell";

export default function PageHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[200px] xl:w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
        <Suspense fallback={<IssueShell />}>
          <IssueRoom params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function IssueRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Room issueId={id}>
      <DisplayWhenInboxOpen>
        <div className="border-r w-[200px] xl:w-[300px]">
          <Inbox />
        </div>
      </DisplayWhenInboxOpen>
      <div className="flex-grow">
        <Issue issueId={id} />
      </div>
      <RoomErrors />
    </Room>
  );
}
