import { prepareTextMentionNotificationEmailAsReact } from "@liveblocks/emails";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";
import { DOCUMENT_URL } from "@/constants";
import { getDocument } from "@/lib/actions";
import { getUser, getUsers } from "@/lib/database";

export async function textMentionEmail(
  liveblocks: Liveblocks,
  event: TextMentionNotificationEvent
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
    emailData = await prepareTextMentionNotificationEmailAsReact(
      liveblocks,
      event,
      {
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
          Container: ({ children }) => (
            <main style={{ margin: "12px 0" }}>{children}</main>
          ),

          // `user` is the optional data returned from `resolveUsers`
          Mention: ({ element, user }) => (
            <span style={{ color: "red" }}>
              @{user?.name ?? element.userId}
            </span>
          ),
        },
      }
    );
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

  const email = (
    <div>
      <div>
        @{emailData.mention.author.id} at{" "}
        {emailData.mention.createdAt.toString()}
      </div>
      <div>{emailData.mention.reactContent}</div>
    </div>
  );

  console.log();
  console.log(`Sending text mention email to ${emailAddress}:`);
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
