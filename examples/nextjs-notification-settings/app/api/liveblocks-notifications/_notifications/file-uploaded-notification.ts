import type { CustomNotificationEvent } from "@liveblocks/node";

// Maybe add some utils to handle custom notification event??

export async function sendFileUploadedNotification(
  event: CustomNotificationEvent
): Promise<Response> {
  let response: Response;
  switch (event.data.channel) {
    case "email": {
      // send email notification
      response = new Response(null, { status: 200 });
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
