import { Section, Text } from "@react-email/components";
import type { CommentEmailAsReactData } from "@liveblocks/emails";

import type { CompanyInfo, RoomInfo } from "./types";
import { getProps } from "./_utils/getProps";

import { EmailRoot } from "./_components/email-root";
import { CompanyRow } from "./_components/company-row";
import { Headline } from "./_components/headline";
import { Comment } from "./_components/comment";

type EmailProps = {
  company: CompanyInfo;
  room: RoomInfo;
  comments: CommentEmailAsReactData[];
};

const previewProps: EmailProps = {
  company: {
    name: "Acme Inc.",
    url: "https://liveblocks.io/comments",
  },
  room: {
    name: "🏃🏻 2024 races",
    url: "https://liveblocks.io/comments?room_id=2024-races",
  },
  comments: [
    {
      id: "cm_0",
      threadId: "th_0",
      createdAt: new Date(2024, 2, 4, 4, 6, 47),
      author: {
        id: "tatum-paolo@example.com",
        info: {
          name: "Tatum Paolo",
          color: "#F0D885",
          avatar: "https://liveblocks.io/avatars/avatar-3.png",
        },
      },
      reactBody: (
        <Text className="text-sm m-0 mb-4 text-email-comment-foreground">
          <span>
            Great work on the visual designs! Can we discuss the color scheme in
            our next meeting?
          </span>
        </Text>
      ),
      url: "https://liveblocks.io?room_id=2024-races#cm_0",
      roomId: "2024-races",
    },
    {
      id: "cm_1",
      threadId: "th_0",
      createdAt: new Date(2024, 2, 4, 5, 12, 35),
      author: {
        id: "anjali-wanda@example.com",
        info: {
          name: "Anjali Wanda",
          color: "#85EED6",
          avatar: "https://liveblocks.io/avatars/avatar-4.png",
        },
      },
      reactBody: (
        <Text className="text-sm m-0 mb-4 text-email-comment-foreground">
          <span>
            I think we could narrow down the demographics a bit more. Let's
            discuss in our next meeting.
          </span>
        </Text>
      ),
      url: "https://liveblocks.io?room_id=2024-races#cm_1",
      roomId: "2024-races",
    },
  ],
};

const getPreviewText = (
  comments: CommentEmailAsReactData[],
  roomName: RoomInfo["name"]
): string => {
  const room = roomName ?? "unknown room";
  if (comments.length === 1) {
    const author = comments[0].author;
    return `${author.info.name} left a comment in ${room}`;
  }

  return `${comments.length} new comments in ${room}`;
};

const getHeadlineParts = (
  comments: CommentEmailAsReactData[],
  roomName?: RoomInfo["name"]
): [string, string, string] => {
  const room = roomName ?? "unknown room";
  if (comments.length === 1) {
    const author = comments[0].author;
    return [author.info.name, "left a comment in", room];
  }

  return [`${comments.length} new comments`, "in", room];
};

export default function Email(props: EmailProps) {
  const { company, room, comments } = getProps(props, previewProps);

  const previewText = getPreviewText(comments, room.name);
  const headlineParts = getHeadlineParts(comments, room?.name);

  return (
    <EmailRoot preview={previewText}>
      <CompanyRow name={company.name} url={company.url} variant="header" />
      <Section className="my-12">
        <Headline>
          {headlineParts[0]}{" "}
          <span className="font-normal">{headlineParts[1]}</span>{" "}
          {headlineParts[2]}
        </Headline>
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            {...comment}
            variant={comments.length > 1 ? "several" : "onlyOne"}
          />
        ))}
        <CompanyRow name={company.name} url={company.url} variant="footer" />
      </Section>
    </EmailRoot>
  );
}
