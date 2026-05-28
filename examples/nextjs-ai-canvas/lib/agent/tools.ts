export type AgentStatus = "thinking" | "editing" | "idle";

export type AgentToolInputMap = {
  html_canvas_box: {
    targetShapeId?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    title?: string;
    html: string;
  };
};

export const AGENT_TOOLS = [
  {
    name: "html_canvas_box",
    description:
      "Create or update an HTML canvas box. Use this to design app screens and website sections. Always provide a short 1-3 word title.",
    input_schema: {
      type: "object",
      properties: {
        targetShapeId: { type: "string" },
        x: { type: "number", description: "Top-left x position (for create)." },
        y: { type: "number", description: "Top-left y position (for create)." },
        w: { type: "number" },
        h: { type: "number" },
        title: { type: "string", description: "Box title, 1-3 words." },
        html: {
          type: "string",
          description: "HTML content for the UI box.",
        },
      },
      required: ["html"],
      additionalProperties: false,
    },
  },
];
