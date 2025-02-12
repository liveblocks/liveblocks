import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";
import { DOCUMENT_URL } from "@/constants";
import { getDocument } from "@/lib/actions";
import { getUser, getUsers } from "@/lib/database";

export async function threadEmail(
  liveblocks: Liveblocks,
  event: ThreadNotificationEvent
) {
  // The user to send the email to
  const user = await getUser(event.data.userId);
  const emailAddress = user?.id;

  if (!emailAddress) {
    return new Response("User not found", {
      status: 400,
    });
  }

  let emailData;

  try {
    emailData = await prepareThreadNotificationEmailAsReact(liveblocks, event, {
      resolveUsers: async ({ userIds }) => {
        const usersData = await getUsers({ userIds });

        return usersData.map((userData) =>
          userData
            ? {
                name: userData.name,
                avatar: userData.avatar,
              }
            : { name: "", avatar: "" }
        );
      },
      resolveRoomInfo: async ({ roomId }) => {
        const roomData = await getDocument({ documentId: roomId });

        if (!roomData.data) {
          return {};
        }

        return {
          name: roomData.data.name,
          url: DOCUMENT_URL(roomData.data.type, roomData.data.id),
        };
      },
      components: {
        Paragraph: ({ children }) => (
          <p style={{ margin: "12px 0" }}>{children}</p>
        ),

        // `user` is the optional data returned from `resolveUsers`
        Mention: ({ element, user }) => (
          <span style={{ color: "red" }}>@{user?.name ?? element.id}</span>
        ),

        // If the link is rich-text render it, otherwise use the URL
        Link: ({ element, href }) => (
          <a href={href} style={{ textDecoration: "underline" }}>
            {element?.text ?? href}
          </a>
        ),
      },
    });
  } catch (err) {
    console.log(err);
    return new Response("Could not fetch thread notification data", {
      status: 500,
    });
  }

  // All comments have already been read
  if (!emailData) {
    return new Response(null, { status: 200 });
  }

  let email;
  switch (emailData.type) {
    case "unreadMention": {
      email = (
        <div>
          <div>
            @{emailData.comment.author.id} at{" "}
            {emailData.comment.createdAt
              .toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .replace(",", "")}
          </div>
          <div>{emailData.comment.reactBody}</div>
        </div>
      );
      break;
    }

    case "unreadReplies": {
      email = (
        <div>
          {emailData.comments.map((comment) => (
            <div key={comment.id}>
              <div>
                @{comment.author.id} at {comment.createdAt.toString()}
              </div>
              <div>{comment.reactBody}</div>
            </div>
          ))}
        </div>
      );
      break;
    }
  }

  console.log();
  console.log(`Sending thread email to ${emailAddress}:`);
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
