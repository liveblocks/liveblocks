import { LABELS, RoomWithMetadata } from "@/config";
import { getUser } from "@/database";
import { liveblocks } from "@/liveblocks.server.config";
import { Suspense } from "react";
import { IssuesListRow } from "@/components/IssuesListRow";

export function IssuesList({
  initialRooms,
}: {
  initialRooms: RoomWithMetadata[];
}) {
  const rooms = initialRooms;

  const inReview = rooms.filter((room) => room.metadata.progress === "review");
  const inProgress = rooms.filter(
    (room) => room.metadata.progress === "progress"
  );
  const todo = rooms.filter((room) => room.metadata.progress === "todo");
  const none = rooms.filter((room) => room.metadata.progress === "none");
  const done = rooms.filter((room) => room.metadata.progress === "done");

  return (
    <div>
      {inReview.length ? (
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          In Review
        </div>
      ) : null}
      {inReview.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {inProgress.length ? (
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          In Progress
        </div>
      ) : null}
      {inProgress.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {todo.length ? (
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          Todo
        </div>
      ) : null}
      {todo.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {none.length ? (
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          None
        </div>
      ) : null}
      {none.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {done.length ? (
        <div className="bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          Done
        </div>
      ) : null}
      {done.map((room) => (
        <Row key={room.id} room={room} />
      ))}
    </div>
  );
}

export function Row({ room }: { room: RoomWithMetadata }) {
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

// function Row({ room }: { room: RoomWithMetadata }) {
//   return (
//     <Suspense fallback={<div>loading</div>}>
//       <LoadStorage room={room} />
//     </Suspense>
//   );
// }
//
// // In a production environment I would instead use webhooks to sync storage to room metadata
// // You would only need a single getRooms call for every document, as the metadata would be there
// // It's easier to create an example without webhooks, which is why I've opted for this here
// async function LoadStorage({ room }: { room: RoomWithMetadata }) {
//   const storage = await liveblocks.getStorageDocument(room.id, "json");
//   return <IssuesListRow room={room} storage={storage} />;
// }
