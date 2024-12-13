import React from "react";
import { Section, Text } from "@react-email/components";
import type { CommentEmailAsReactData } from "@liveblocks/emails";

import type { CompanyInfo, RoomInfo } from "./_lib/types";
import { getProps } from "./_utils/getProps";
import { Layout } from "./_components/layout";
import { Header } from "./_components/header";
import { Headline } from "./_components/headline";
import { Comment } from "./_components/comment";
import {
  getUnreadRepliesHeadlineParts,
  getUnreadRepliesPreviewText,
} from "./_utils/comments";

type UnreadRepliesEmailProps = {
  company: CompanyInfo;
  room: RoomInfo;
  comments: CommentEmailAsReactData[];
};

const previewProps: UnreadRepliesEmailProps = {
  company: {
    name: "Acme Inc.",
    url: "https://liveblocks.io/comments",
    logoUrl: "https://liveblocks.io/apple-touch-icon.png",
  },
  room: {
    name: "Project Proposal - Q4",
    url: "https://liveblocks.io/comments?room_id=project-proposal-q4",
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
        <Text className="text-sm m-0 text-black">
          <span>
            I've reviewed this section and think we need a more detailed
            breakdown of the budget. It might help if we add a few more figures
            to illustrate the cost distribution over the next six months. Let me
            know if you'd like me to draft a version for you.
          </span>
        </Text>
      ),
      url: "https://liveblocks.io/comments?room_id=project-proposal-q4#cm_0",
      roomId: "project-proposal-q4",
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
        <Text className="text-sm text-black m-0">
          <span>Looks good overall. Just a quick note on the timeline.</span>
        </Text>
      ),
      url: "https://liveblocks.io/comments?room_id=project-proposal-q4#cm_1",
      roomId: "project-proposal-q4",
    },
  ],
};

const UnreadRepliesEmail = (
  props: UnreadRepliesEmailProps
): React.ReactElement => {
  const { company, room, comments } = getProps(props, previewProps);

  const previewText = getUnreadRepliesPreviewText(comments, room.name);
  const headlineParts = getUnreadRepliesHeadlineParts(comments, room.name);

  return (
    <Layout preview={previewText}>
      <Header {...company} />
      <Section>
        <Headline className="mb-4" parts={headlineParts} />
        {comments.map((comment, index) => (
          <Comment
            key={comment.id}
            className={index > 0 ? "mt-3" : undefined}
            {...comment}
            isHighlighted={comments.length === 1}
          />
        ))}
      </Section>
    </Layout>
  );
};

export default UnreadRepliesEmail;
