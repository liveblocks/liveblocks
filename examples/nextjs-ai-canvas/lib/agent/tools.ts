export type AgentStatus = "thinking" | "editing" | "idle";

export type AgentToolInputMap = {
  create_shape: {
    type?: "geo" | "text";
    x: number;
    y: number;
    w?: number;
    h?: number;
    props?: Record<string, string | number | boolean | null>;
  };
  update_shape: {
    id: string;
    patch: Record<string, unknown>;
  };
  delete_shape: {
    id: string;
  };
  select: {
    ids: string[];
  };
  move_cursor: {
    x: number;
    y: number;
  };
  set_status: {
    status: AgentStatus;
  };
  finish: {
    message: string;
  };
};

export const AGENT_TOOLS = [
  {
    name: "create_shape",
    description:
      "Create a new shape in the canvas near a requested location. Use type=geo unless text is explicitly requested.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["geo", "text"] },
        x: { type: "number" },
        y: { type: "number" },
        w: { type: "number" },
        h: { type: "number" },
        props: {
          type: "object",
          additionalProperties: {
            type: ["string", "number", "boolean", "null"],
          },
        },
      },
      required: ["x", "y"],
      additionalProperties: false,
    },
  },
  {
    name: "update_shape",
    description: "Update an existing shape record by id with a patch object.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        patch: {
          type: "object",
          additionalProperties: true,
        },
      },
      required: ["id", "patch"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_shape",
    description: "Delete an existing shape by id.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "select",
    description: "Highlight shape ids via agent presence selection.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
  },
  {
    name: "move_cursor",
    description: "Move the agent cursor to a specific position.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["x", "y"],
      additionalProperties: false,
    },
  },
  {
    name: "set_status",
    description: "Set agent status to thinking, editing, or idle.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["thinking", "editing", "idle"],
        },
      },
      required: ["status"],
      additionalProperties: false,
    },
  },
  {
    name: "finish",
    description: "Call this when finished with a concise final summary message.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
];
