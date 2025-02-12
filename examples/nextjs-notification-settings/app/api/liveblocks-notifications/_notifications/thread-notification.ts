import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";
import { sendThreadNotificationEmail } from "../_emails/thead-notification";

export async function sendThreadNotification(
  liveblocks: Liveblocks,
  event: ThreadNotificationEvent
): Promise<Response> {
  let response: Response;
  switch (event.data.channel) {
    case "email": {
      // send email notification
      response = await sendThreadNotificationEmail(liveblocks, event);
      break;
    }
    case "slack": {
      // send slack notification
      response = new Response(null, { status: 200 });
      break;
    }
    case "teams": {
      // send teams notification
      response = new Response(null, { status: 200 });
      break;
    }
    case "webPush": {
      // send web push notification
      response = new Response(null, { status: 200 });
      break;
    }
  }

  return response;
}
