import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { CommentEmailAsReactData } from "@liveblocks/emails";
import { getProps } from "./_utils/getProps";

type RoomInfo = {
  name?: string;
  url?: string;
};
type EmailProps = {
  company: {
    name: string;
    url: string;
  };
  roomInfo: RoomInfo;
  comments: CommentEmailAsReactData[];
};

const previewProps: EmailProps = {
  company: {
    name: "Acme Inc.",
    url: "https://acme.inc",
  },
  roomInfo: {
    name: "🏃🏻 2024 races",
    url: "https://acme.inc?room_id=2024-races",
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
        <Text className="text-sm">
          <span>
            Great work on the visual designs! Can we discuss the color scheme in
            our next meeting?
          </span>
        </Text>
      ),
      url: "https://acme.inc?room_id=2024-races#cm_0",
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
        <Text className="text-sm">
          <span>
            I think we could narrow down the demographics a bit more. Let's
            discuss in our next meeting.
          </span>
        </Text>
      ),
      url: "https://acme.inc?room_id=2024-races#cm_1",
      roomId: "2024-races",
    },
  ],
};

const getPreviewText = (
  comments: CommentEmailAsReactData[],
  roomInfo: RoomInfo
): string => {
  const roomName = roomInfo.name ?? "unknown room";
  if (comments.length === 1) {
    const author = comments[0].author;
    return `${author.info.name} left a comment in ${roomName}`;
  }

  return `${comments.length} new comments in ${roomName}`;
};

export default function Email(props: EmailProps) {
  const { company, roomInfo, comments } = getProps(props, previewProps);
  const previewText = getPreviewText(comments, roomInfo);
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="py-8">
            <Row>
              <Column className="w-[32px]">
                <div className="w-[24px] h-[24px] bg-black rounded-lg flex items-center justify-center">
                  <div className="w-[10px] h-[10px] rounded-full bg-white" />
                </div>
              </Column>
              <Column>
                <Heading as="h1" className="m-0">
                  {company.name}
                </Heading>
              </Column>
            </Row>
            <Section className="my-12">
              <Text className="text-sm font-medium">{previewText}</Text>
              {comments.map((comment) => (
                <Section
                  key={comment.id}
                  className="my-4 rounded-md py-4 pl-4 pr-8"
                  // NOTE: `react-email` do not interpret correctly borders
                  // in `className` attribute w/ `tailwindcss`.
                  style={{ border: "solid 1px rgba(23, 23, 23, 0.10)" }}
                >
                  <Row>
                    <Column className="w-[34px]">
                      <Img
                        className="rounded-full bg-[hsla(0, 0%, 93%, 1)]"
                        width={28}
                        height={28}
                        src={comment.author.info.avatar}
                      />
                    </Column>
                    <Column>
                      {comment.author.info.name}{" "}
                      <span className="text-[rgba(23, 23, 23, 0.6)] text-xs">
                        {comment.createdAt.toLocaleDateString()}
                      </span>
                    </Column>
                  </Row>
                  <Row className="mt-1">
                    <Column className="w-[34px]" />
                    <Column>
                      {comment.reactBody}
                      <Button
                        className="bg-[#171717] rounded-md px-4 h-[36px] text-white text-sm font-medium flex justify-center w-max flex-col"
                        href={comment.url}
                      >
                        View comment
                      </Button>
                    </Column>
                  </Row>
                </Section>
              ))}
              <Row>
                <Column className="w-[26px]">
                  <div className="w-[20px] h-[20px] bg-black rounded-md flex items-center justify-center">
                    <div className="w-[8px] h-[8px] rounded-full bg-white" />
                  </div>
                </Column>
                <Column>
                  <Text className="text-xs font-medium">{company.name}</Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
