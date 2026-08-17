export type AgentStatus = "thinking" | "editing" | "idle";

export type AgentToolInputMap = {
  create_box: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    title?: string;
    html: string;
  };
  edit_box: {
    targetShapeId: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    title?: string;
    html?: string;
  };
};

const dimensionProps = {
  x: { type: "number", description: "Top-left x position." },
  y: { type: "number", description: "Top-left y position." },
  w: {
    type: "number",
    description:
      "Box width in px. Choose any size that fits the design (e.g. ~390 for a mobile screen, ~1280 for a desktop layout, smaller for a single component).",
  },
  h: {
    type: "number",
    description:
      "Box height in px. Choose any size that fits the design's content and aspect ratio.",
  },
  title: { type: "string", description: "Box title, 1-3 words." },
};

export const AGENT_TOOLS = [
  {
    name: "create_box",
    description:
      "Create a brand new HTML canvas box. Use this to design a new app screen or website section. Always provide a short 1-3 word title.",
    input_schema: {
      type: "object",
      properties: {
        ...dimensionProps,
        html: {
          type: "string",
          description: "HTML content for the new UI box.",
        },
      },
      required: ["html"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_box",
    description:
      "Edit an EXISTING HTML canvas box in place. Use this when the user asks to change, update, restyle, or tweak a box that already exists. Pass targetShapeId set to the id of the box to modify.",
    input_schema: {
      type: "object",
      properties: {
        targetShapeId: {
          type: "string",
          description: "Id of the existing box to edit.",
        },
        ...dimensionProps,
        html: {
          type: "string",
          description:
            "New HTML content for the box. Omit to keep the existing HTML (e.g. when only changing the title).",
        },
      },
      required: ["targetShapeId"],
      additionalProperties: false,
    },
  },
];
