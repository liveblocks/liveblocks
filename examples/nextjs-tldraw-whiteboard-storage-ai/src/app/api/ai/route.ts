import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Liveblocks, LiveMap } from "@liveblocks/node";

const exampleOutput = [
  [
    "document:document",
    {
      gridSize: 10,
      name: "",
      meta: {},
      id: "document:document",
      typeName: "document",
    },
  ],
  [
    "page:page",
    {
      meta: {},
      id: "page:page",
      name: "Page 1",
      index: "a1",
      typeName: "page",
    },
  ],
  [
    "shape:9tvuLXb10kgKUCnlL-dvy",
    {
      x: 632.50390625,
      y: 161.69140625,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      id: "shape:9tvuLXb10kgKUCnlL-dvy",
      type: "geo",
      props: {
        shape: "rectangle",
      },
      parentId: "page:page",
      index: "a3Bxv",
      typeName: "shape",
    },
  ],
  [
    "shape:5LQxQQYzyoEOBdvDMpmqV",
    {
      x: 545.31,
      y: 348.84,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      id: "shape:5LQxQQYzyoEOBdvDMpmqV",
      type: "draw",
      props: {},
      parentId: "page:page",
      index: "a22mB",
      typeName: "shape",
    },
  ],
  [
    "shape:appleBody",
    {
      x: 300,
      y: 300,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      id: "shape:appleBody",
      type: "geo",
      props: {
        shape: "ellipse",
        w: 100,
        h: 120,
        fill: "red",
        stroke: "darkred",
      },
      parentId: "page:page",
      index: "a100",
      typeName: "shape",
    },
  ],
  [
    "shape:appleLeaf",
    {
      x: 320,
      y: 250,
      rotation: -20,
      isLocked: false,
      opacity: 1,
      meta: {},
      id: "shape:appleLeaf",
      type: "geo",
      props: {
        shape: "ellipse",
        w: 30,
        h: 20,
        fill: "green",
        stroke: "darkgreen",
      },
      parentId: "page:page",
      index: "a101",
      typeName: "shape",
    },
  ],
];

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const { input, roomId } = await request.json();

  // Mutate a single room
  await liveblocks.mutateStorage(
    roomId,

    async ({ root }) => {
      const records = root.get("records");

      exampleOutput.forEach(([id, record]) => {
        records.set(id as string, record);
      });

      return;
      // root.set("records", new LiveMap());

      // const recordsMap = root.get("records").toImmutable();
      // const recordsArray = Array.from(recordsMap.entries());
      // console.log("records", JSON.stringify(recordsArray, null, 2));
      // console.log("input", input, roomId);

      const { text } = await generateText({
        model: openai("o3-mini"),
        system: `You accept a query and return tldraw state as a response. 
You can only return tldraw state as JSON, and no other text. 
This state is the whole state of the canvas after your edits.
This state should be ready to be converted into a Map, so it must be an array of tuples.
Each tuple contains an ID and a TLRecord value.
Here is an example of the output format, showing a line and a box:

\`\`\`
[
  [
    "shape:9tvuLXb10kgKUCnlL-dvy",
    {
      "x": 285.62890625,
      "y": 135.234375,
      "rotation": 0,
      "isLocked": false,
      "opacity": 1,
      "meta": {},
      "id": "shape:9tvuLXb10kgKUCnlL-dvy",
      "type": "geo",
      "props": {
        "w": 200,
        "h": 200,
        "geo": "rectangle",
        "color": "black",
        "labelColor": "black",
        "fill": "none",
        "dash": "draw",
        "size": "m",
        "font": "draw",
        "text": "",
        "align": "middle",
        "verticalAlign": "middle",
        "growY": 0,
        "url": "",
        "scale": 1
      },
      "parentId": "page:page",
      "index": "a3Bxv",
      "typeName": "shape"
    }
  ],
  [
    "shape:5LQxQQYzyoEOBdvDMpmqV",
    {
      "x": 161.66015625,
      "y": 158.06640625,
      "rotation": 0,
      "isLocked": false,
      "opacity": 1,
      "meta": {},
      "id": "shape:5LQxQQYzyoEOBdvDMpmqV",
      "type": "line",
      "props": {
        "dash": "draw",
        "size": "m",
        "color": "black",
        "spline": "line",
        "points": {
          "a1": {
            "id": "a1",
            "index": "a1",
            "x": 0,
            "y": 0
          },
          "a2Bvz": {
            "id": "a2Bvz",
            "index": "a2Bvz",
            "x": 34.640625,
            "y": 137.578125
          }
        },
        "scale": 1
      },
      "parentId": "page:page",
      "index": "a49VK",
      "typeName": "shape"
    }
  ],
  [
    "document:document",
    {
      "gridSize": 10,
      "name": "",
      "meta": {},
      "id": "document:document",
      "typeName": "document"
    }
  ],
  [
    "page:page",
    {
      "meta": {},
      "id": "page:page",
      "name": "Page 1",
      "index": "a1",
      "typeName": "page"
    }
  ]
]
\`\`\`

This is the format you must use.

Generate what the users asks for.`,
        prompt: `This is the current tldraw state, you will return your edits in the same format: 

\`\`\`
${recordsArray}
\`\`\`
    
This is the user's query: 

${input}`,
      });

      console.log("text", text);

      // root.get("records").set(text);

      // root.get("records").push(text);
    }
  );

  return new Response();
}
