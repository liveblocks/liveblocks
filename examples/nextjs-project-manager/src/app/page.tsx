import { Room } from "@/app/Room";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";
import { Nav } from "@/components/Nav";
import { liveblocks } from "@/liveblocks.server.config";
import { RoomData } from "@liveblocks/node";
import { LABELS, RoomWithMetadata } from "@/config";
import { getUser } from "@/database";
import { EditorVoidOptions } from "slate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PageIssue() {
  const rooms = (await liveblocks.getRooms()).data as RoomWithMetadata[];

  const inReview = rooms.filter((room) => room.metadata.progress === "review");
  const inProgress = rooms.filter(
    (room) => room.metadata.progress === "progress"
  );
  const todo = rooms.filter((room) => room.metadata.progress === "todo");
  const none = rooms.filter((room) => room.metadata.progress === "none");
  const done = rooms.filter((room) => room.metadata.progress === "done");

  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded">
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          In Review
        </div>
        {inReview.map((room) => (
          <Row key={room.id} room={room} />
        ))}
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          In Progress
        </div>
        {inProgress.map((room) => (
          <Row key={room.id} room={room} />
        ))}
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          Todo
        </div>
        {todo.map((room) => (
          <Row key={room.id} room={room} />
        ))}
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          None
        </div>
        {none.map((room) => (
          <Row key={room.id} room={room} />
        ))}
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          Done
        </div>
        {done.map((room) => (
          <Row key={room.id} room={room} />
        ))}
      </main>
    </div>
  );
}

function Row({ room }: { room: RoomWithMetadata }) {
  const { issueId, title, priority, progress, assignedTo, labels } =
    room.metadata;

  const assignedUser = assignedTo !== "none" ? getUser(assignedTo) : null;

  const date = room.createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <a
      href={`/issue/${issueId}`}
      className="flex h-10 items-center justify-between px-4 text-sm"
    >
      <div className="flex gap-2 items-center">
        <div className="w-12">{priority}</div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="flex gap-5 items-center">
        {LABELS.filter((label) => labels.includes(label.id)).map(
          ({ id, text }) => (
            <div
              key={id}
              className="text-sm rounded-full px-2 py-0.5 border shadow-xs flex items-center gap-1.5 select-none text-neutral-700"
            >
              <div className="bg-neutral-400/60 rounded-full w-2 h-2" />
              {text}{" "}
            </div>
          )
        )}
        <div className="flex-none w-12 text-right">{date}</div>
        <div>
          {assignedUser ? (
            <img
              className="w-6 h-6 rounded-full overflow-hidden"
              src={assignedUser.info.avatar}
            />
          ) : (
            <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200" />
          )}
        </div>
      </div>
    </a>
  );
}
