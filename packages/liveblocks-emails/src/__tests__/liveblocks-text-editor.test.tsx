import type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  LiveblocksTextEditorNode,
} from "../liveblocks-text-editor";
import {
  convertTextEditorNodesAsHtml,
  convertTextEditorNodesAsReact,
  transformAsLiveblocksTextEditorNodes,
} from "../liveblocks-text-editor";
import {
  generateInboxNotificationId,
  renderToStaticMarkup,
  resolveUsers,
} from "./_helpers";
import { createLexicalMentionNodeWithContext } from "./_lexical-helpers";
import { createTipTapMentionNodeWithContext } from "./_tiptap-helpers";

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

const content4: LiveblocksTextEditorNode[] = [
  {
    type: "text",
    text: "Trying with <script>alert('hi')</script>!",
    bold: false,
    italic: false,
    strikethrough: false,
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
  describe("transform serialized nodes into Liveblocks Text Editor nodes", () => {
    it("should transform lexical nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-mina";

      const mentionNodeWithContext = createLexicalMentionNodeWithContext({
        mentionedUserId: userId,
        mentionId,
      });

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "lexical",
        mention: mentionNodeWithContext,
      });

      const expected: LiveblocksTextEditorNode[] = [
        {
          type: "text",
          text: "Some things to add ",
          bold: true,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "mention",
          userId,
        },
        {
          type: "text",
          text: "?",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
      ];

      expect(nodes).toEqual(expected);
    });

    it("should transform tiptap nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-dracula";

      const mentionNodeWithContext = createTipTapMentionNodeWithContext({
        mentionedUserId: userId,
        mentionId,
      });

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "tiptap",
        mention: mentionNodeWithContext,
      });

      const expected: LiveblocksTextEditorNode[] = [
        {
          type: "text",
          text: "Hey this a tip tap ",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "text",
          text: "example",
          bold: true,
          italic: true,
          strikethrough: false,
          code: false,
        },
        {
          type: "text",
          text: " hiha! ",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "mention",
          userId,
        },
        {
          type: "text",
          text: " fun right?",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
      ];

      expect(nodes).toEqual(expected);
    });
  });

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

  describe("converts content as html", () => {
    describe("w/o users resolver", () => {
      it("should convert simple text elements", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(content1);
        const expected =
          '<div style="font-size:14px;">I think it&#39;s really neat mate 👌</div>';

        expect(htmlContent).toEqual(expected);
      });

      it("should convert with bold and italic", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(content2);
        const expected =
          '<div style="font-size:14px;"><strong style="font-weight:500;">Bold text</strong> and <em>italic text</em></div>';

        expect(htmlContent).toEqual(expected);
      });

      it("should convert with with code and strikethrough", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(content3);
        const expected =
          '<div style="font-size:14px;"><code style="font-family:ui-monospace, Menlo, Monaco, &quot;Cascadia Mono&quot;, &quot;Segoe UI Mono&quot;, &quot;Roboto Mono&quot;, &quot;Oxygen Mono&quot;, &quot;Ubuntu Mono&quot;, &quot;Source Code Pro&quot;, &quot;Fira Mono&quot;, &quot;Droid Sans Mono&quot;, &quot;Consolas&quot;, &quot;Courier New&quot;, monospace;background-color:rgba(0,0,0,0.05);border:solid 1px rgba(0,0,0,0.1);border-radius:4px;">Code text</code> and <s>strikethrough text</s></div>';

        expect(htmlContent).toEqual(expected);
      });

      it("should convert with a user mention", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(
          buildContentWithMention({ mentionedUserId: "user-dracula" })
        );
        const expected =
          '<div style="font-size:14px;">Hello <span data-mention style="color:blue;">@user-dracula</span> !</div>';

        expect(htmlContent).toEqual(expected);
      });

      it("should escape html entities", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(content4);
        const expected =
          '<div style="font-size:14px;">Trying with &lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;!</div>';

        expect(htmlContent).toEqual(expected);
      });
    });

    describe("w/ users resolver", () => {
      it("should convert with a resolved user mention", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(
          buildContentWithMention({ mentionedUserId: "user-2" }),
          { resolveUsers }
        );

        const expected =
          '<div style="font-size:14px;">Hello <span data-mention style="color:blue;">@Tatum Paolo</span> !</div>';

        expect(htmlContent).toEqual(expected);
      });
    });

    describe("w/ custom styles", () => {
      const styles: Partial<ConvertTextEditorNodesAsHtmlStyles> = {
        container: {
          fontSize: "16px",
        },
        mention: {
          color: "purple",
        },
      };

      it("should convert mentions", async () => {
        const htmlContent = await convertTextEditorNodesAsHtml(
          buildContentWithMention({ mentionedUserId: "user-0" }),
          {
            resolveUsers,
            styles,
          }
        );

        const expected =
          '<div style="font-size:16px;">Hello <span data-mention style="color:purple;">@Charlie Layne</span> !</div>';

        expect(htmlContent).toEqual(expected);
      });
    });
  });
});
