import { Section, Text } from "@react-email/components";
import type { CommentEmailAsReactData } from "@liveblocks/emails";

import { getProps } from "./_utils/getProps";
import type { CompanyInfo, RoomInfo } from "./_lib/types";

import { Layout } from "./_components/layout";
import { Header } from "./_components/header";
import { Headline } from "./_components/headline";
import { Comment } from "./_components/comment";
import {
  getUnreadMentionHeadlineParts,
  getUnreadMentionPreviewText,
} from "./_utils/comments";

type UnreadMentionEmailProps = {
  company: CompanyInfo;
  room: RoomInfo;
  comment: CommentEmailAsReactData;
};

const previewProps: UnreadMentionEmailProps = {
  company: {
    name: "Acme Inc.",
    url: "https://liveblocks.io/comments",
    logoUrl: "https://liveblocks.io/apple-touch-icon.png",
  },
  room: {
    name: "User Research Strategy",
    url: "https://liveblocks.io/comments?room_id=project-proposal-q4",
  },
  comment: {
    id: "cm_2",
    threadId: "th_1",
    createdAt: new Date(2024, 2, 4, 4, 6, 47),
    author: {
      id: "emil-joyce@my-liveblocks-app.com",
      info: {
        name: "Emil Joyce",
        color: "#8594F0",
        avatar: "https://liveblocks.io/avatars/avatar-6.png",
      },
    },
    reactBody: (
      <Text className="text-sm m-0 text-black">
        <span>
          For the user research phase, we'll need{" "}
          <span data-mention className="text-email-accent font-medium">
            @Quinn Elton
          </span>{" "}
          to lead the interviews and compile the findings. His expertise in
          qualitative research will be crucial for this stage.
        </span>
      </Text>
    ),
    url: "https://liveblocks.io/comments?room_id=project-proposal-q4#cm_2",
    roomId: "project-proposal-q4",
  },
};

export default function UnreadMentionEmail(props: UnreadMentionEmailProps) {
  const { company, room, comment } = getProps(props, previewProps);

  const previewText = getUnreadMentionPreviewText(comment, room.name);
  const headlineParts = getUnreadMentionHeadlineParts(comment, room.name);

  return (
    <Layout preview={previewText}>
      <Header {...company} />
      <Section>
        <Headline className="mb-4" parts={headlineParts} />
        <Comment {...comment} isHighlighted />
      </Section>
    </Layout>
  );
}
