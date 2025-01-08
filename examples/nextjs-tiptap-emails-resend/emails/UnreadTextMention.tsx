import { Section, Text } from "@react-email/components";
import type { MentionEmailAsReactData } from "@liveblocks/emails";

import { getProps } from "./_utils/getProps";
import type { CompanyInfo, RoomInfo } from "./_lib/types";

import { Layout } from "./_components/layout";
import { Header } from "./_components/header";
import { Headline } from "./_components/headline";
import { Mention } from "./_components/mention";

const UNKNOWN_ROOM = "Unknown room" as const;

type UnreadTextMentionProps = {
  company: CompanyInfo;
  room: RoomInfo;
  mention: MentionEmailAsReactData;
};

const previewProps: UnreadTextMentionProps = {
  company: {
    name: "Acme Inc.",
    url: "https://liveblocks.io/comments",
    logoUrl: "https://liveblocks.io/apple-touch-icon.png",
  },
  room: {
    name: "User Research Strategy",
    url: "https://liveblocks.io/comments?room_id=project-proposal-q4",
  },
  mention: {
    id: "in_1",
    createdAt: new Date(2024, 2, 4, 4, 6, 47),
    author: {
      id: "user-0",
      info: {
        name: "Charlie Layne",
        color: "#D583F0",
        avatar: "https://liveblocks.io/avatars/avatar-1.png",
      },
    },
    reactContent: (
      <Text className="text-sm text-black m-0">
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
    roomId: "project-proposal-q4",
  },
};

export default function UnreadTextMention(props: UnreadTextMentionProps) {
  const { company, room, mention } = getProps(props, previewProps);
  const previewText = `${mention.author.info.name} mentioned you in ${room.name ?? UNKNOWN_ROOM}`;

  return (
    <Layout preview={previewText}>
      <Header {...company} />
      <Section>
        <Headline
          className="mb-4"
          parts={[
            mention.author.info.name,
            "mentioned you in",
            room.name ?? UNKNOWN_ROOM,
          ]}
        />
        <Mention {...mention} roomUrl={room.url} />
      </Section>
    </Layout>
  );
}
