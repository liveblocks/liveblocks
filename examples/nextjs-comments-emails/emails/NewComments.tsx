import {
  Button,
  Html,
  Heading,
  Section,
  Row,
  Column,
  Text,
  Body,
  Img,
  Container,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { UserMeta } from "@/liveblocks.config";

export type CommentEmailInfo = {
  user: UserMeta | null;
  date: Date;
  html: string;
};

type Props = {
  title: string;
  href: string;
  comments: CommentEmailInfo[];
};

export default function NewComments(props: Props) {
  const { title, href, comments } = getProps(props);

  return (
    <Html
      style={{
        background: "#fff",
        color: "#444",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Body
        style={{
          maxWidth: "600px",
          margin: "40px auto 0",
        }}
      >
        <Container>
          <Heading as="h1" style={{ fontSize: "24px" }}>
            {title}
          </Heading>
          <Hr style={{ margin: "16px 0 24px" }} />
          {comments.map(({ user, date, html }) => (
            <Section>
              <Row style={{ marginBottom: "-8px" }}>
                {user ? (
                  <Column width={30}>
                    <Img
                      src={user.info.avatar}
                      alt={user.info.name}
                      width={24}
                      height={24}
                      style={{ borderRadius: 99999 }}
                    />
                  </Column>
                ) : null}
                <Column>
                  {user ? (
                    <>
                      <strong>{user.info.name}</strong>
                    </>
                  ) : (
                    <>Someone</>
                  )}{" "}
                  <small> at {date.toLocaleTimeString()}</small>
                </Column>
              </Row>
              <Row>
                <Column dangerouslySetInnerHTML={{ __html: html }} />
              </Row>
            </Section>
          ))}
          <Button
            href={href}
            style={{
              marginTop: "8px",
              background: "#000",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: "500",
              fontSize: "14px",
              borderRadius: "4px",
            }}
          >
            Open thread
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

const exampleProps: Props = {
  title: "Jory Quispe replied in Your App",
  href: "https://example.com/room/my-room",
  comments: [
    {
      html: "<p>Nice comment <span data-mention>@Jory Quispe</span>.</p>",
      date: new Date(2024, 2, 4, 4, 6, 47),
      user: {
        id: "charlie.layne@example.com",
        info: {
          name: "Charlie Layne",
          color: "#D583F0",
          avatar: "https://liveblocks.io/avatars/avatar-1.png",
        },
      },
    },
    {
      html: "<p>Thanks <span data-mention>@Charlie Layne</span>!</p>",
      date: new Date(2024, 2, 4, 5, 12, 35),
      user: {
        id: "jory-quispe@example.com",
        info: {
          name: "Jory Quispe",
          color: "#85DBF0",
          avatar: "https://liveblocks.io/avatars/avatar-7.png",
        },
      },
    },
  ],
};

function getProps(props: Props) {
  if (!props || Object.keys(props).length === 0) {
    return exampleProps;
  }

  return props;
}
