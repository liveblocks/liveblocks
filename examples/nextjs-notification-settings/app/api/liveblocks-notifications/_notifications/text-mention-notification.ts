import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";
import { sendTextMentionNotificationEmail } from "../_emails/text-mention-notification";

export async function sendTextMentionNotification(
  liveblocks: Liveblocks,
  event: TextMentionNotificationEvent
): Promise<Response> {
  let response: Response;
  switch (event.data.channel) {
    case "email": {
      // send email notification
      response = await sendTextMentionNotificationEmail(liveblocks, event);
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
