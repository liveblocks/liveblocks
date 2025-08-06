"use server";

import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function createRoomWithContent(document?: "france" | "beethoven") {
  const roomId = nanoid();
  await liveblocks.createRoom(roomId, {
    defaultAccesses: ["room:read", "room:presence:write"],
  });

  if (document) {
    await withProsemirrorDocument(
      { roomId, client: liveblocks },
      async (api) => {
        await api.setContent(document === "france" ? france : beethoven);
      }
    );
  }

  return roomId;
}

const france = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: {
        level: 1,
      },
      content: [
        {
          type: "text",
          text: "France",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "France, officially the French Republic, is a country primarily located in Western Europe. It is known for its rich history, diverse culture, and significant influence on art, science, and philosophy.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Geography",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "France shares borders with Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain, and Andorra. It has coastlines along the Atlantic Ocean and the Mediterranean Sea.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Culture",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "France has a deep cultural heritage, renowned for its cuisine, fashion, literature, and art. Cities like Paris are global centers of culture and innovation.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Language",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The official language is French, and it is one of the most widely spoken languages in the world.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Key Facts",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Capital: Paris",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Population: ~67 million",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Currency: Euro (€)",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Government: Unitary semi-presidential republic",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const beethoven = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Ludwig van Beethoven" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ludwig van Beethoven was a German composer and pianist, widely regarded as one of the greatest composers in the history of Western music. He was a crucial figure in the transition between the Classical and Romantic eras.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Early Life" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Beethoven was born in Bonn in December 1770. He showed musical talent from a young age and was taught by his father and later by renowned musicians such as Christian Gottlob Neefe.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Career and Works" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Beethoven moved to Vienna, where he gained a reputation as a virtuoso pianist and innovative composer. His compositions include 9 symphonies, 32 piano sonatas, 16 string quartets, and the opera 'Fidelio'.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Deafness" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Remarkably, Beethoven continued to compose music even after he began losing his hearing in his late 20s. By the time he wrote many of his greatest works, he was almost completely deaf.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Legacy" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Beethoven's music had a profound influence on generations of composers and musicians. His ability to express deep emotion and break musical boundaries made him a symbol of artistic genius and human resilience.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Key Facts" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Born: December 1770, Bonn, Germany" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Died: March 26, 1827, Vienna, Austria" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Famous works: Symphony No. 9, Moonlight Sonata, Für Elise",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Known for: Bridging the Classical and Romantic eras in music",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
