import { Resend } from "resend";
import { prepareTextMentionNotificationEmailAsReact } from "@liveblocks/emails";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";

import { Text } from "@react-email/components";
import { render } from "@react-email/render";

import UnreadTextMention from "../../../../emails/UnreadTextMention";

import { company } from "../_shared/metadata";
import { resolveUsers, resolveRoomInfo } from "../_shared/resolvers";

export async function sendTextMentionNotificationEmail(
  liveblocks: Liveblocks,
  event: TextMentionNotificationEvent
): Promise<Response> {
  // Add your Resend API key from https://resend.com/api-keys
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  let emailData;

  try {
    emailData = await prepareTextMentionNotificationEmailAsReact(
      liveblocks,
      event,
      {
        resolveUsers,
        resolveRoomInfo,
        // And the magic to use `react-email` components happens here 🥳
        // Or you can use your own components if you're not using `react-email`
        // to customize mentions' components.
        components: {
          Container: ({ children }) => (
            <Text className="text-sm text-black m-0">{children}</Text>
          ),
          Mention: ({ element, user }) => (
            <span className="text-email-accent font-medium">
              @{user?.name ?? element.userId}
            </span>
          ),
        },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response("Something went wrong", { status: 400 });
  }

  if (emailData !== null) {
    const room = {
      name: emailData.roomInfo.name,
      url: emailData.roomInfo.url,
    };

    const subject = "You have one unread notification";
    // Render your email's HTML
    const html = await render(
      <UnreadTextMention
        company={company}
        room={room}
        mention={emailData.mention}
      />
    );

    // Render your email's HTML
    const { error } = await resend.emails.send({
      from: "My Liveblocks App <hello@my-liveblocks-app.com>",
      to: event.data.userId, // In this example, user IDs are email addresses,
      subject,
      html,
    });

    if (error) {
      console.log(error);
      return new Response(JSON.stringify(error), {
        status: 500,
      });
    }

    return new Response(null, { status: 200 });
  }

  return new Response("No email to send", { status: 200 });
}
