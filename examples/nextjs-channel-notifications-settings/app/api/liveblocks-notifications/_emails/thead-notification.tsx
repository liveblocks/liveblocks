import { Resend } from "resend";
import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";

import { Text } from "@react-email/components";
import { render } from "@react-email/render";

import UnreadMentionEmail from "../../../../emails/UnreadMention";
import UnreadRepliesEmail from "../../../../emails/UnreadReplies";

import { company } from "../_shared/metadata";
import { resolveUsers, resolveRoomInfo } from "../_shared/resolvers";

// Add your Resend API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY as string);

export async function sendThreadNotificationEmail(
  liveblocks: Liveblocks,
  event: ThreadNotificationEvent
): Promise<Response> {
  let emailData;
  try {
    emailData = await prepareThreadNotificationEmailAsReact(liveblocks, event, {
      resolveUsers,
      resolveRoomInfo,
      components: {
        Paragraph: ({ children }) => (
          <Text className="text-sm text-black m-0 mb-4">{children}</Text>
        ),
        Mention: ({ element, user }) => (
          <span className="text-email-accent font-medium">
            @{user?.name ?? element.id}
          </span>
        ),
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Something went wrong", { status: 400 });
  }

  if (emailData !== null) {
    const room = {
      name: emailData.roomInfo.name,
      url: emailData.roomInfo.url,
    };

    let email, subject;

    switch (emailData.type) {
      case "unreadReplies": {
        email = (
          <UnreadRepliesEmail
            company={company}
            room={room}
            comments={emailData.comments}
          />
        );
        subject = `You have ${emailData.comments.length} unread notifications.`;
        break;
      }
      case "unreadMention": {
        email = (
          <UnreadMentionEmail
            company={company}
            room={room}
            comment={emailData.comment}
          />
        );
        subject = "You have one unread notification.";
        break;
      }
    }

    const html = await render(email, { pretty: true });

    const { error } = await resend.emails.send({
      from: "Liveblocks <hello@dev.notifications.liveblocks.io>",
      // XXX
      // CHANGE WITH YOUR EMAIL
      to: "aurelien.dupaysdexemple+channel@liveblocks.io",
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