import { Button, Html, Heading } from "@react-email/components";
import * as React from "react";
import { CommentData } from "@liveblocks/node";

type Props = {
  mentionedBy?: string;
  comments: CommentData[];
};

export default function NewComments(props: Props) {
  const { mentionedBy, comments } = getProps(props);

  return (
    <Html
      style={{
        background: "#fff",
        color: "#444",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Heading as="h1">
        {mentionedBy ? `${mentionedBy} mentioned you` : "New comments"}
      </Heading>
      <Button
        href="https://example.com"
        style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
      >
        View thread
      </Button>
    </Html>
  );
}

const exampleProps: Props = {
  mentionedBy: "Jory",
  comments: [],
};

function getProps(props: Props) {
  if (!props || Object.keys(props).length === 0) {
    return exampleProps;
  }

  return props;
}
