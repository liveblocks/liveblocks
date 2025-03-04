import { CustomNotificationEvent, Liveblocks } from "@liveblocks/node";
import { DOCUMENT_URL } from "@/constants";
import { getDocument } from "@/lib/actions";
import { getUser } from "@/lib/database";

export async function addedToDocumentEmail(
  liveblocks: Liveblocks,
  event: CustomNotificationEvent
) {
  // The user to send the email to
  const user = await getUser(event.data.userId);
  const emailAddress = user?.id;

  if (!emailAddress) {
    return new Response("User not found", {
      status: 400,
    });
  }

  const notification = await liveblocks.getInboxNotification({
    userId: event.data.userId,
    inboxNotificationId: event.data.inboxNotificationId,
  });

  if (notification.kind !== "$addedToDocument") {
    return new Response("Wrong notification type", {
      status: 400,
    });
  }

  const roomData = await getDocument({
    documentId: notification.activities[0].data.documentId,
  });

  if (!roomData.data) {
    return new Response("Room not found", {
      status: 400,
    });
  }

  const url = DOCUMENT_URL(roomData.data.type, roomData.data.id);

  const email = (
    <div>
      <h1>Document invite</h1>
      <p>
        You’ve been invited to <strong>{roomData.data.name}</strong>
      </p>
      <a href={url}>Enter room</a>
    </div>
  );

  console.log();
  console.log(`Sending $addedToDocument email to ${emailAddress}:`);
  console.log(email);

  // Example code, send email to the user's email address
  // import { Resend } from "resend";
  // const resend = new Resend("re_123456789");
  // try {
  //   const data = await resend.emails.send({
  //     from: "My company <hello@my-company.com>",
  //     to: emailAddress,
  //     subject: "New comment",
  //     react: email,
  //   });
  // } catch (err) {
  //   console.error(err);
  // }

  return new Response(null, { status: 200 });
}
