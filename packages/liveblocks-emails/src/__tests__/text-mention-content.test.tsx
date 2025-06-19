import { html, htmlSafe } from "@liveblocks/core";

import { MENTION_CHARACTER } from "../lib/constants";
import type { LiveblocksTextEditorNode } from "../liveblocks-text-editor";
import {
  convertTextMentionContent,
  type ConvertTextMentionContentElements,
} from "../text-mention-content";
import { resolveUsers } from "./_helpers";

const buildMentionTextEditorNodes = ({
  mentionedUserId,
}: {
  mentionedUserId: string;
}): LiveblocksTextEditorNode[] => [
  {
    type: "text",
    text: "Hello ",
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  },
  {
    type: "mention",
    kind: "user",
    id: mentionedUserId,
  },
  {
    type: "text",
    text: " !",
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  },
];

describe("convert text mention content", () => {
  const elements: ConvertTextMentionContentElements<string> = {
    container: ({ children }) => {
      const content = [
        // prettier-ignore
        html`<div>${htmlSafe(children.join(""))}</div>`,
      ];

      return content.join("\n"); //NOTE: to represent a valid HTML string
    },
    mention: ({ node, user }) => {
      // prettier-ignore
      return html`<span data-mention>${MENTION_CHARACTER}${user?.name ? html`${user?.name}` :  node.id}</span>`
    },
    text: ({ node }) => {
      // Note: construction following the schema 👇
      // <code><s><em><strong>{node.text}</strong></s></em></code>
      let children = node.text;
      if (!children) {
        return html`${children}`;
      }

      if (node.bold) {
        // prettier-ignore
        children = html`<strong>${children}</strong>`;
      }

      if (node.italic) {
        // prettier-ignore
        children = html`<em>${children}</em>`;
      }

      if (node.strikethrough) {
        // prettier-ignore
        children = html`<s>${children}</s>`;
      }

      if (node.code) {
        // prettier-ignore
        children = html`<code>${children}</code>`;
      }

      return html`${children}`;
    },
  };

  it("should convert text mention content", async () => {
    const mention = buildMentionTextEditorNodes({
      mentionedUserId: "user-dracula",
    });
    const content = await convertTextMentionContent<string>(mention, {
      elements,
    });
    const expected =
      "<div>Hello <span data-mention>@user-dracula</span> !</div>";

    expect(content).toEqual(expected);
  });

  it("should convert with bold and italic", async () => {
    const mention: LiveblocksTextEditorNode[] = [
      {
        type: "text",
        text: "Hello ",
        bold: true,
        italic: true,
        strikethrough: false,
        code: false,
      },
      {
        type: "mention",
        kind: "user",
        id: "user-dracula",
      },
      {
        type: "text",
        text: " !",
        bold: false,
        italic: false,
        strikethrough: false,
        code: false,
      },
    ];
    const content = await convertTextMentionContent<string>(mention, {
      elements,
    });
    const expected =
      "<div><em><strong>Hello </strong></em><span data-mention>@user-dracula</span> !</div>";

    expect(content).toEqual(expected);
  });

  it("should convert with strikethrough and code", async () => {
    const mention: LiveblocksTextEditorNode[] = [
      {
        type: "text",
        text: "Hello ",
        bold: false,
        italic: false,
        strikethrough: true,
        code: true,
      },
      {
        type: "mention",
        kind: "user",
        id: "user-dracula",
      },
      {
        type: "text",
        text: " !",
        bold: false,
        italic: false,
        strikethrough: false,
        code: false,
      },
    ];
    const content = await convertTextMentionContent<string>(mention, {
      elements,
    });
    const expected =
      "<div><code><s>Hello </s></code><span data-mention>@user-dracula</span> !</div>";

    expect(content).toEqual(expected);
  });

  it("should resolve user info", async () => {
    const mention = buildMentionTextEditorNodes({ mentionedUserId: "user-0" });
    const content = await convertTextMentionContent<string>(mention, {
      elements,
      resolveUsers,
    });
    const expected =
      "<div>Hello <span data-mention>@Charlie Layne</span> !</div>";

    expect(content).toEqual(expected);
  });

  describe("use-case/escaping html entities", () => {
    it("should escape html entities in text", async () => {
      const mention: LiveblocksTextEditorNode[] = [
        {
          type: "text",
          text: "Hello <b>injected</b> ",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "mention",
          kind: "user",
          id: "user-dracula",
        },
      ];

      const content = await convertTextMentionContent<string>(mention, {
        elements,
      });
      const expected =
        "<div>Hello &lt;b&gt;injected&lt;/b&gt; <span data-mention>@user-dracula</span></div>";
      expect(content).toEqual(expected);
    });

    it("should escape html entities in mention w/ username", async () => {
      const mention = buildMentionTextEditorNodes({
        mentionedUserId: "user-mina",
      });
      const content = await convertTextMentionContent<string>(mention, {
        elements,
        resolveUsers: ({ userIds }) => {
          return userIds.map((userId) => {
            return {
              id: userId,
              name: "<style>injected style</style>",
            };
          });
        },
      });
      const expected =
        "<div>Hello <span data-mention>@&lt;style&gt;injected style&lt;/style&gt;</span> !</div>";

      expect(content).toEqual(expected);
    });
  });
});
