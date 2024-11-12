import React from "react";

import { convertTextEditorNodesAsReact } from "../liveblocks-text-editor";
import { renderToStaticMarkup } from "./_helpers";

describe("liveblocks text editor", () => {
  describe("converts content as React", () => {
    describe("w/o users resolved", () => {
      it("should convert simple texts elements", async () => {
        const reactContent = await convertTextEditorNodesAsReact([
          {
            type: "text",
            text: "I think it's really neat mate 👌",
            bold: false,
            italic: false,
            strikethrough: false,
            code: false,
          },
        ]);
        const markupContent = renderToStaticMarkup(<>{reactContent}</>);
        const expected = renderToStaticMarkup(
          <div>
            <span>I think it's really neat mate 👌</span>
          </div>
        );

        expect(markupContent).toEqual(expected);
      });
    });
  });
});
