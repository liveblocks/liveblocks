"use client";

import type { CopilotId } from "@liveblocks/core";
import { defineAiTool } from "@liveblocks/core";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useSendAiMessage,
} from "@liveblocks/react/suspense";
import {
  AiChat,
  AiChatComponentsEmptyProps,
  AiTool,
} from "@liveblocks/react-ui";
import { use, useRef } from "react";

function useRenderCount() {
  const ref = useRef(0);
  return ++ref.current;
}

function useStageTimer(invocationId: string) {
  const timersRef = useRef(
    new Map<
      string,
      {
        startTime: number | null;
        executingTime: number | null;
        receivingToExecutingTime: number | null;
        executingToExecutedTime: number | null;
      }
    >()
  );

  const getTimer = (id: string) => {
    if (!timersRef.current.has(id)) {
      timersRef.current.set(id, {
        startTime: null,
        executingTime: null,
        receivingToExecutingTime: null,
        executingToExecutedTime: null,
      });
    }
    return timersRef.current.get(id)!;
  };

  const timer = getTimer(invocationId);

  return {
    markReceivingStart: () => {
      // Only start timing on the very first time we see receiving
      if (timer.startTime === null) {
        timer.startTime = Date.now();
        timer.receivingToExecutingTime = null;
        timer.executingToExecutedTime = null;
      }
    },
    markExecuting: () => {
      if (timer.startTime && timer.receivingToExecutingTime === null) {
        timer.receivingToExecutingTime = Date.now() - timer.startTime;
        timer.executingTime = Date.now();
      }
    },
    markExecuted: () => {
      if (timer.executingTime && timer.executingToExecutedTime === null) {
        timer.executingToExecutedTime = Date.now() - timer.executingTime;
      }
    },
    getReceivingToExecutingTime: () => timer.receivingToExecutingTime,
    getExecutingToExecutedTime: () => timer.executingToExecutedTime,
  };
}

export default function HtmlStreamingPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const copilotId =
    (process.env.NEXT_PUBLIC_LIVEBLOCKS_DEFAULT_COPILOT_ID as CopilotId) ||
    undefined;
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <ClientSideSuspense fallback={null}>
          <AiChat
            chatId={chatId}
            copilotId={copilotId}
            components={{
              Empty: AiChatEmptyComponent,
            }}
            tools={{
              displayHtml: defineAiTool()({
                description: "Display HTML content in a preview pane",
                parameters: {
                  type: "object",
                  properties: {
                    author: {
                      type: "string",
                      description: "Author of the content",
                    },
                    title: {
                      type: "string",
                      description: "Suggested title for the page",
                    },
                    rawHTML: {
                      type: "string",
                      description: "The HTML content to display",
                    },
                  },
                  required: ["author", "title", "rawHTML"],
                  additionalProperties: false,
                },
                execute: () => {
                  return { data: { success: true } };
                },
                render: (props) => {
                  /* eslint-disable react-hooks/rules-of-hooks */
                  const renderCount = useRenderCount();
                  const stageTimer = useStageTimer(props.invocationId);
                  /* eslint-enable react-hooks/rules-of-hooks */

                  // Track stage transitions
                  if (props.stage === "receiving") {
                    stageTimer.markReceivingStart();
                  } else if (props.stage === "executing") {
                    stageTimer.markExecuting();
                  } else if (props.stage === "executed") {
                    stageTimer.markExecuted();
                  }

                  const receivingToExecutingTime =
                    stageTimer.getReceivingToExecutingTime();
                  const executingToExecutedTime =
                    stageTimer.getExecutingToExecutedTime();

                  return (
                    <AiTool>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        Stage: {props.stage}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        Render count: {renderCount}
                      </div>
                      {receivingToExecutingTime !== null && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginBottom: "8px",
                          }}
                        >
                          Receiving → Executing: {receivingToExecutingTime}ms
                        </div>
                      )}
                      {executingToExecutedTime !== null && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginBottom: "8px",
                          }}
                        >
                          Executing → Executed: {executingToExecutedTime}ms
                        </div>
                      )}
                      <AiTool.Inspector />
                    </AiTool>
                  );
                },
              }),
              largeDataProcessor: defineAiTool()({
                description:
                  "Process large amounts of data with many parameters for stress testing",
                parameters: {
                  type: "object",
                  properties: {
                    config: {
                      type: "object",
                      description: "Configuration object",
                      properties: {
                        environment: {
                          type: "string",
                          description: "Environment setting",
                        },
                        debug: { type: "boolean", description: "Debug mode" },
                        timeout: {
                          type: "number",
                          description: "Timeout in milliseconds",
                        },
                        retries: {
                          type: "number",
                          description: "Number of retries",
                        },
                      },
                    },
                    metadata: {
                      type: "object",
                      description: "Metadata information",
                      properties: {
                        version: {
                          type: "string",
                          description: "Version number",
                        },
                        author: { type: "string", description: "Author name" },
                        timestamp: {
                          type: "string",
                          description: "Creation timestamp",
                        },
                        tags: {
                          type: "array",
                          items: { type: "string" },
                          description: "Tags list",
                        },
                      },
                    },
                    dataPoints: {
                      type: "array",
                      description: "Array of data points to process",
                      items: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            description: "Unique identifier",
                          },
                          value: {
                            type: "number",
                            description: "Numeric value",
                          },
                          label: {
                            type: "string",
                            description: "Human readable label",
                          },
                          category: {
                            type: "string",
                            description: "Category classification",
                          },
                          properties: {
                            type: "object",
                            description: "Additional properties",
                            additionalProperties: true,
                          },
                        },
                      },
                    },
                    filters: {
                      type: "array",
                      description: "Filtering criteria",
                      items: {
                        type: "object",
                        properties: {
                          field: {
                            type: "string",
                            description: "Field to filter on",
                          },
                          operator: {
                            type: "string",
                            enum: [
                              "equals",
                              "contains",
                              "greater_than",
                              "less_than",
                            ],
                          },
                          value: {
                            type: "string",
                            description: "Filter value",
                          },
                        },
                      },
                    },
                    transformations: {
                      type: "array",
                      description: "Data transformations to apply",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: ["map", "filter", "reduce", "sort"],
                          },
                          field: {
                            type: "string",
                            description: "Target field",
                          },
                          operation: {
                            type: "string",
                            description: "Operation to perform",
                          },
                          parameters: {
                            type: "object",
                            additionalProperties: true,
                          },
                        },
                      },
                    },
                    outputFormat: {
                      type: "object",
                      description: "Output formatting options",
                      properties: {
                        format: {
                          type: "string",
                          enum: ["json", "csv", "xml", "yaml"],
                        },
                        compression: {
                          type: "boolean",
                          description: "Enable compression",
                        },
                        encryption: {
                          type: "boolean",
                          description: "Enable encryption",
                        },
                        headers: {
                          type: "array",
                          items: { type: "string" },
                          description: "Custom headers",
                        },
                      },
                    },
                    performance: {
                      type: "object",
                      description: "Performance tuning options",
                      properties: {
                        batchSize: {
                          type: "number",
                          description: "Processing batch size",
                        },
                        parallelism: {
                          type: "number",
                          description: "Parallel processing threads",
                        },
                        caching: {
                          type: "boolean",
                          description: "Enable result caching",
                        },
                        optimization: {
                          type: "string",
                          enum: ["speed", "memory", "balanced"],
                        },
                      },
                    },
                    validation: {
                      type: "object",
                      description: "Data validation rules",
                      properties: {
                        strict: {
                          type: "boolean",
                          description: "Enable strict validation",
                        },
                        rules: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              field: { type: "string" },
                              type: { type: "string" },
                              required: { type: "boolean" },
                              pattern: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                    additionalContext: {
                      type: "string",
                      description:
                        "Any additional context or instructions for processing the data",
                    },
                  },
                  required: ["config", "dataPoints", "outputFormat"],
                  additionalProperties: false,
                },
                execute: () => {
                  return { data: { processed: true, recordCount: 0 } };
                },
                render: (props) => {
                  /* eslint-disable react-hooks/rules-of-hooks */
                  const renderCount = useRenderCount();
                  const stageTimer = useStageTimer(props.invocationId);
                  /* eslint-enable react-hooks/rules-of-hooks */

                  // Track stage transitions
                  if (props.stage === "receiving") {
                    stageTimer.markReceivingStart();
                  } else if (props.stage === "executing") {
                    stageTimer.markExecuting();
                  } else if (props.stage === "executed") {
                    stageTimer.markExecuted();
                  }

                  const receivingToExecutingTime =
                    stageTimer.getReceivingToExecutingTime();
                  const executingToExecutedTime =
                    stageTimer.getExecutingToExecutedTime();

                  return (
                    <AiTool>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        Stage: {props.stage}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        Render count: {renderCount}
                      </div>
                      {receivingToExecutingTime !== null && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginBottom: "8px",
                          }}
                        >
                          Receiving → Executing: {receivingToExecutingTime}ms
                        </div>
                      )}
                      {executingToExecutedTime !== null && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginBottom: "8px",
                          }}
                        >
                          Executing → Executed: {executingToExecutedTime}ms
                        </div>
                      )}
                      <AiTool.Inspector />
                    </AiTool>
                  );
                },
              }),
            }}
            className="h-screen"
          />
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

const CHAT_SUGGESTIONS = [
  {
    label: "Simple marketing page",
    message: "Create a simple marketing page for a SaaS product",
  },
  {
    label: "Landing page with hero",
    message:
      "Generate a landing page with a hero section, features, and footer",
  },
  {
    label: "Product showcase",
    message:
      "Create an HTML page showcasing a new product with images and descriptions",
  },
  {
    label: "Contact page",
    message: "Build a contact page with a form and company information",
  },
  {
    label: "🔥 Stress Test (Large Tool Call)",
    message:
      "Process a dataset with 500 records, apply complex transformations, and generate a comprehensive analytics report with detailed filtering, validation rules, and performance optimization settings. Include metadata tracking, custom headers, batch processing configuration, and extensive data point analysis.",
  },
];

function AiChatEmptyComponent({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="justify-end h-full flex flex-col gap-4 px-6 pb-4">
      <h2 className="text-xl font-semibold">HTML Streaming Test</h2>
      <p className="text-sm text-gray-600">
        Ask me to generate HTML and watch it stream in real-time!
      </p>

      {/* Suggestion Tags */}
      <div className="flex flex-wrap gap-2">
        {CHAT_SUGGESTIONS.map(({ label, message }) => (
          <button
            key={label}
            onClick={() => sendMessage(message)}
            className="text-sm rounded-full border border-[var(--lb-foreground-subtle)] px-4 py-2 font-medium"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
