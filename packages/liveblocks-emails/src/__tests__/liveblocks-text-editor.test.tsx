import React from "react";

import type { LiveblocksTextEditorNode } from "../liveblocks-text-editor";
import { convertTextEditorNodesAsReact } from "../liveblocks-text-editor";
import { renderToStaticMarkup } from "./_helpers";

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

describe("liveblocks text editor", () => {
  describe("converts content as React", () => {
    describe("w/o users resolved", () => {
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
    });
  });
});
