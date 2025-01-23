import { Liveblocks } from "@liveblocks/node";
import { USER_INFO } from "../dummy-users";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  // XXX
  // @ts-expect-error
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
});

export async function POST(request: Request) {
  const body = await request.json();
  console.log("body", body);
  const userIndex = Math.floor(Math.random() * USER_INFO.length);

  try {
    await liveblocks.triggerInboxNotification({
      userId: `user-${userIndex}`,
      kind: "$fileUploaded",
      subjectId: "my-file",
      activityData: {
        file: "http://localhost:3000/my-file.zip",
        size: 256,
        success: true,
      },
      roomId: body.roomId,
    });

    // await liveblocks.updateNotificationSettings({
    //   userId: `user-${userIndex}`,
    //   data: {
    //     email: {
    //       textMention: true,
    //       thread: false,
    //       $fileUploaded: true,
    //     },
    //   },
    // });

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
