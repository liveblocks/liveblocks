import { Liveblocks } from "@liveblocks/node";
import { users } from "@/data/users";

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const body = await request.json();

  // We do not want to send the custom notification
  // to the same current authenticated user
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
