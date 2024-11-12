import React from "react";

import type {
  ConvertTextEditorNodesAsReactComponents,
  LiveblocksTextEditorNode,
} from "../liveblocks-text-editor";
import { convertTextEditorNodesAsReact } from "../liveblocks-text-editor";
import { renderToStaticMarkup, resolveUsers } from "./_helpers";

const content1: LiveblocksTextEditorNode[] = [
  {
    type: "text",
    text: "I think it's really neat mate 👌",
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  },
];

const content2: LiveblocksTextEditorNode[] = [
  {
    type: "text",
    text: "Bold text",
    bold: true,
    italic: false,
    strikethrough: false,
    code: false,
  },
  {
    type: "text",
    text: " and ",
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  },
  {
    type: "text",
    text: "italic text",
    bold: false,
    italic: true,
    strikethrough: false,
    code: false,
  },
];

const content3: LiveblocksTextEditorNode[] = [
  {
    type: "text",
    text: "Code text",
    bold: false,
    italic: false,
    strikethrough: false,
    code: true,
  },
  {
    type: "text",
    text: " and ",
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  },
  {
    type: "text",
    text: "strikethrough text",
    bold: false,
    italic: false,
    strikethrough: true,
    code: false,
  },
];

const buildContentWithMention = ({
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
    userId: mentionedUserId,
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

describe("liveblocks text editor", () => {
  describe("converts content as React", () => {
    describe("w/o users resolver", () => {
      it("should convert simple texts elements", async () => {
        const reactContent = await convertTextEditorNodesAsReact(content1);
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <div>
            <span>I think it's really neat mate 👌</span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });

      it("should convert with bold and italic", async () => {
        const reactContent = await convertTextEditorNodesAsReact(content2);
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <div>
            <span>
              <strong>Bold text</strong>
            </span>
            <span> and </span>
            <span>
              <em>italic text</em>
            </span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });

      it("should convert with code and strikethrough", async () => {
        const reactContent = await convertTextEditorNodesAsReact(content3);
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <div>
            <span>
              <code>Code text</code>
            </span>
            <span> and </span>
            <span>
              <s>strikethrough text</s>
            </span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });

      it("should convert with a user mention", async () => {
        const reactContent = await convertTextEditorNodesAsReact(
          buildContentWithMention({ mentionedUserId: "user-dracula" })
        );
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <div>
            <span>Hello </span>
            <span data-mention>@user-dracula</span>
            <span> !</span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });
    });

    describe("w/ users resolver", () => {
      it("should convert with a resolved user mention", async () => {
        const reactContent = await convertTextEditorNodesAsReact(
          buildContentWithMention({ mentionedUserId: "user-2" }),
          { resolveUsers }
        );
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <div>
            <span>Hello </span>
            <span data-mention>@Tatum Paolo</span>
            <span> !</span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });
    });

    describe("w/ custom components", () => {
      const components: Partial<ConvertTextEditorNodesAsReactComponents> = {
        Container: ({ children }) => <main>{children}</main>,
        Mention: ({ element, user }) => (
          <span>user#{user?.name ?? element.userId}</span>
        ),
      };

      it("should convert mentions", async () => {
        const reactContent = await convertTextEditorNodesAsReact(
          buildContentWithMention({ mentionedUserId: "user-0" }),
          {
            resolveUsers,
            components,
          }
        );
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);

        const expected = renderToStaticMarkup(
          <main>
            <span>Hello </span>
            <span>user#Charlie Layne</span>
            <span> !</span>
          </main>
        );

        expect(markupContent).toEqual(expected);
      });
    });
  });
});
