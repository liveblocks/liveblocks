/* eslint-disable */

import type { CommentBody } from "@liveblocks/core";
import { expectAssignable, expectNotAssignable } from "tsd";

// ❌ Invalid required properties
{
  expectNotAssignable<CommentBody>({});
  expectNotAssignable<CommentBody>({ version: 1 });
  expectNotAssignable<CommentBody>({ content: [] });
  expectNotAssignable<CommentBody>({ version: 2, content: [] });
  expectNotAssignable<CommentBody>({ version: "1", content: [] });
  expectNotAssignable<CommentBody>({ version: 1, content: "text" });
  expectNotAssignable<CommentBody>({ version: 1, content: {} });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "invalid" }],
  });
}

// ❌ Invalid block elements
{
  // Invalid paragraph element
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph" }],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph", children: "text" }],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph", children: [{}] }],
  });
}

// ❌ Invalid inline elements
{
  // Invalid text element
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph", children: [{ text: 123 }] }],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph", children: [{ bold: true }] }],
  });

  // Invalid mention element
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "mention" }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "mention", id: 123 }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "mention", kind: "invalid", id: "user1" }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "mention", kind: "user", id: "user1", userIds: [] }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        // Missing `type: "mention"` so it's a text element
        children: [{ text: "mention", kind: "user", id: "user123" }],
      },
    ],
  });

  // Invalid link element
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [{ type: "paragraph", children: [{ type: "link" }] }],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "link", url: 123 }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "link", url: "https://liveblocks.io", text: 123 }],
      },
    ],
  });
  expectNotAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        // Missing `type: "link"` so it's a text element
        children: [{ text: "link elsewhere", url: "https://liveblocks.io" }],
      },
    ],
  });
}

// ✅ Valid comment bodies
{
  expectAssignable<CommentBody>({
    version: 1,
    content: [],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ text: "Hello world" }],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            text: "Hello",
            bold: true,
            italic: true,
            strikethrough: false,
            code: false,
          },
        ],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "mention", kind: "user", id: "user123" }],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            type: "mention",
            kind: "group",
            id: "group123",
          },
        ],
      },
    ],
  });

  // Paragraph with group mention including userIds
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            type: "mention",
            kind: "group",
            id: "group123",
            userIds: ["user1", "user2"],
          },
        ],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ type: "link", url: "https://liveblocks.io" }],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          {
            type: "link",
            url: "https://liveblocks.io",
            text: "Liveblocks",
          },
        ],
      },
    ],
  });

  // Multiple paragraphs
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [{ text: "First paragraph" }],
      },
      {
        type: "paragraph",
        children: [{ text: "Second paragraph" }],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          { text: "Hey " },
          { type: "mention", kind: "user", id: "user123" },
          { text: ", can you look at " },
          {
            type: "link",
            url: "https://liveblocks.io",
            text: "this link",
          },
          { text: "?" },
        ],
      },
    ],
  });
  expectAssignable<CommentBody>({
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          { text: "Bold text", bold: true },
          { text: " and " },
          { text: "italic text", italic: true },
        ],
      },
      {
        type: "paragraph",
        children: [
          { text: "Code: ", code: true },
          { text: "const x = 1;", code: true },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "mention",
            kind: "group",
            id: "team1",
            userIds: ["user1", "user2", "user3"],
          },
        ],
      },
    ],
  });
}
