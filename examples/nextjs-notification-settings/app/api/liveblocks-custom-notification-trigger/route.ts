import { Liveblocks } from "@liveblocks/node";
import { users } from "@/data/users";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  // XXX
  // @ts-expect-error
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
});

export async function POST(request: Request) {
  const body = await request.json();
  console.log("body", body);

  const currentUserIndex = users.findIndex(
    (user) => user.id === body.currentUserId
  );
  const otherUsers =
    currentUserIndex !== -1
      ? [
          ...users.slice(0, currentUserIndex),
          ...users.slice(currentUserIndex + 1),
        ]
      : users;

  const userIndex = Math.floor(Math.random() * otherUsers.length);

  try {
    await liveblocks.triggerInboxNotification({
      userId: otherUsers[userIndex].id,
      kind: "$fileUploaded",
      subjectId: "my-file",
      activityData: {
        file: "http://localhost:3000/my-file.zip",
        size: 256,
        success: true,
      },
      roomId: body.roomId,
    });

    return new Response(null, { status: 200 });
  } catch (err) {
    return Response.json(
      {
        err,
      },
      { status: 500 }
    );
  }
}
