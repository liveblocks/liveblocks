import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";

import { withProsemirrorDocument } from "../document";

const DEFAULT_BASE_URL = "https://api.liveblocks.io";

const serverYDoc = new Doc();
serverYDoc.getXmlFragment("default");
let serverYdoc: Uint8Array = encodeStateAsUpdate(serverYDoc);

const server = setupServer(
  http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc-binary`, () => {
    return HttpResponse.arrayBuffer(serverYdoc, { status: 200 });
  }),
  http.put(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc`, async ({ request }) => {
    const update = new Uint8Array(await request.arrayBuffer());
    applyUpdate(serverYDoc, update);
    serverYdoc = encodeStateAsUpdate(serverYDoc);
    return HttpResponse.arrayBuffer(serverYdoc, { status: 200 });
  })
);

const client = new Liveblocks({
  secret: "sk_this_is_just_a_test_key",
  // @ts-expect-error hidden config
  baseUrl: DEFAULT_BASE_URL,
});

beforeAll(() => server.listen());
afterAll(() => server.close());

describe("withProsemirrorDocument", () => {
  test("should return an empty document to start", async () => {
    const text = await withProsemirrorDocument<string>(
      {
        client,
        roomId: "test-room",
      },
      (api) => {
        return api.getText();
      }
    );
    expect(text).toEqual("");
  });

  test("should update the doc", async () => {
    const text = await withProsemirrorDocument<string>(
      {
        client,
        roomId: "test-room",
      },
      async (api) => {
        await api.update((_, tr) => {
          return tr.insertText("hello");
        });

        return api.getText();
      }
    );
    expect(text).toEqual("hello");
  });

  test("should set the doc and return JSON", async () => {
    const exampleDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Example Text",
            },
          ],
        },
      ],
    };

    const json = await withProsemirrorDocument<string>(
      {
        client,
        roomId: "test-room",
      },
      async (api) => {
        await api.setContent(exampleDoc);
        return JSON.stringify(api.toJSON());
      }
    );
    expect(json).toEqual(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Example Text"}]},{"type":"paragraph"}]}'
    );
  });

  test("should set the doc and return Markdown", async () => {
    const exampleDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Example Text",
            },
          ],
        },
        {
          type: "heading",
          content: [
            {
              type: "text",
              text: "Example Heading",
            },
          ],
          attrs: {
            level: 1,
          },
        },
      ],
    };

    const markdown = await withProsemirrorDocument<string>(
      {
        client,
        roomId: "test-room",
      },
      async (api) => {
        await api.setContent(exampleDoc);
        return api.toMarkdown();
      }
    );
    expect(markdown).toEqual("Example Text\n\n# Example Heading");
  });

  test("should set the doc and return text using getText and custom blockseperator", async () => {
    const exampleDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Example Text",
            },
          ],
        },
        {
          type: "heading",
          content: [
            {
              type: "text",
              text: "Example Heading",
            },
          ],
          attrs: {
            level: 1,
          },
        },
      ],
    };

    const text = await withProsemirrorDocument<string>(
      {
        client,
        roomId: "test-room",
      },
      async (api) => {
        await api.setContent(exampleDoc);
        return api.getText({ blockSeparator: "<br/>" });
      }
    );
    expect(text).toEqual("Example Text<br/>Example Heading<br/>");
  });
});
