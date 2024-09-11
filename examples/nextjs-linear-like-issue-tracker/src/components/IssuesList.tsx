import { LABELS, PRIORITY_STATES, RoomWithMetadata } from "@/config";
import { getUser } from "@/database";
import { getStorageDocument } from "@/actions/liveblocks";
import { DashIcon } from "@/icons/DashIcon";
import { ProgressInReviewIcon } from "@/icons/ProgressInReviewIcon";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { ProgressTodoIcon } from "@/icons/ProgressTodoIcon";
import { ProgressDoneIcon } from "@/icons/ProgressDoneIcon";
import Link from "next/link";

export function IssuesList({
  initialRooms,
}: {
  initialRooms: RoomWithMetadata[];
}) {
  const rooms = initialRooms;

  // Need webhook set up to see these filters, check comment at bottom of this file
  const inReview = rooms.filter((room) => room.metadata.progress === "review");
  const inProgress = rooms.filter(
    (room) => room.metadata.progress === "progress"
  );
  const todo = rooms.filter((room) => room.metadata.progress === "todo");
  const none = rooms.filter((room) => room.metadata.progress === "none");
  const done = rooms.filter((room) => room.metadata.progress === "done");

  return (
    <div>
      <div className="flex items-center justify-between px-4 text-sm border-b h-10">
        Issues
      </div>
      {inReview.length ? (
        <div className="flex items-center gap-2 bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          <ProgressInReviewIcon className="w-4 h-4 text-emerald-500" />
          In Review
        </div>
      ) : null}
      {inReview.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {inProgress.length ? (
        <div className="flex items-center gap-2 bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          <ProgressInProgressIcon className="w-4 h-4 text-yellow-500" />
          In Progress
        </div>
      ) : null}
      {inProgress.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {todo.length ? (
        <div className="flex items-center gap-2 bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          <ProgressTodoIcon className="w-4 h-4 text-neutral-500" />
          Todo
        </div>
      ) : null}
      {todo.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {none.length ? (
        <div className="flex items-center gap-2 bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          <DashIcon className="w-4 h-4 text-neutral-500" />
          None
        </div>
      ) : null}
      {none.map((room) => (
        <Row key={room.id} room={room} />
      ))}

      {done.length ? (
        <div className="flex items-center gap-2 bg-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-800 w-full">
          <ProgressDoneIcon className="w-4 h-4 text-indigo-500" />
          Done
        </div>
      ) : null}
      {done.map((room) => (
        <Row key={room.id} room={room} />
      ))}
    </div>
  );
}

export async function Row({ room }: { room: RoomWithMetadata }) {
  const { issueId, title, priority, progress, assignedTo, labels } =
    await getMetadataFromRoom(room);

  const assignedUser = assignedTo !== "none" ? getUser(assignedTo) : null;

  const date = room.createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/issue/${issueId}`}
      className="flex h-10 items-center justify-between px-4 text-sm transition-colors hover:bg-neutral-100 border-b"
    >
      <div className="flex gap-2 items-center">
        <div className="w-5">
          {PRIORITY_STATES.find((p) => p.id === priority)?.icon}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="flex gap-3 items-center">
        <div className="flex gap-2 items-center">
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
        </div>
        <div className="flex-none w-12 text-right text-xs">{date}</div>
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
    </Link>
  );
}

async function getMetadataFromRoom(room: RoomWithMetadata) {
  // We recommend setting up webhooks to automatically attach the Storage data
  // to room metadata on changes. Then you can directly use the room instead
  // of calling the Storage API below.
  // More info inside the webhook route at /app/api/storage-webhook/route.ts
  if (process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY) {
    return room.metadata;
  }

  // This will be much slower than the solution above, but it makes it easier
  // to try up the example.
  const {
    meta: { title },
    properties: { progress, priority, assignedTo },
    labels,
  } = await getStorageDocument(room.id);

  return {
    issueId: room.metadata.issueId,
    title,
    progress,
    priority,
    assignedTo,
    labels,
  };
}
