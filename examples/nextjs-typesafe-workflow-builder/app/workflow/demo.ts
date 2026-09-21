import {
  createInputNode,
  createJevNode,
  createLlmNode,
  createOutputNode,
  createWorkflowEdge,
  questionHandleId,
  OUT_HANDLE,
  type WorkflowEdge,
  type WorkflowNode,
} from "./shared";

export const DEMO_WORKFLOW_NAME = "Support ticket triage";

export const DEMO_SAMPLE_INPUT =
  "Hi, I was charged twice for order A-104 this morning. This is the second time this has happened and I'm honestly getting tired of it. Please refund the duplicate charge today.";

const COLUMN = 340;
const ROW = 260;

/**
 * Optional demo, seeded only when explicitly requested. Mirrors intent routing:
 * one Jev call classifies the ticket, and handles route to specialist LLMs.
 */
export function createDemoWorkflow(): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const nodes: WorkflowNode[] = [
    createInputNode({
      position: { x: 0, y: ROW },
      sample: DEMO_SAMPLE_INPUT,
    }),
    createJevNode({
      id: "triage",
      position: { x: COLUMN, y: 0 },
      label: "Triage",
      questions: [
        {
          id: "intent",
          type: "choice",
          instructions: "What is the main request in `input`?",
          options: [
            {
              key: "billing",
              description: "Charges, refunds, invoices, or payment problems.",
            },
            {
              key: "technical",
              description: "Something is broken or not working as expected.",
            },
            {
              key: "feature_request",
              description: "The customer asks for new functionality.",
            },
            { key: "other", description: "Anything else." },
          ],
        },
        {
          id: "urgent",
          type: "noul",
          instructions:
            "Does `input` need a response today (repeated issue, money at stake, or explicit deadline)?",
          threshold: 0.7,
        },
        {
          id: "frustration",
          type: "score",
          instructions: "How frustrated does the customer appear in `input`?",
          levels: [
            { key: "calm", description: "Calm and neutral." },
            { key: "concerned", description: "Concerned but civil." },
            {
              key: "angry",
              description: "Very angry or using strong language.",
            },
          ],
        },
      ],
    }),
    createLlmNode({
      id: "billing-reply",
      position: { x: COLUMN * 2, y: 0 },
      label: "Draft billing reply",
      system:
        "You are a support agent for an online store. Reply in under 80 words, in plain text.",
      prompt:
        "Write a reply to this billing ticket. Confirm the duplicate charge will be refunded within 3-5 business days.\n\nTicket:\n{{input}}\n\nCustomer frustration level: {{answers.frustration}}",
    }),
    createLlmNode({
      id: "technical-reply",
      position: { x: COLUMN * 2, y: ROW },
      label: "Draft technical reply",
      system:
        "You are a technical support engineer. Reply in under 80 words, in plain text.",
      prompt:
        "Write a reply to this technical ticket. Ask for the one piece of information you need most to debug it.\n\nTicket:\n{{input}}",
    }),
    createLlmNode({
      id: "escalation",
      position: { x: COLUMN * 2, y: ROW * 2 },
      label: "Escalation summary",
      // AND: runs only when both `intent = billing` and `urgent = yes` fired.
      activation: "all",
      system: "You write terse internal notes for a support team lead.",
      prompt:
        "Summarize this urgent ticket in two bullet points for the on-call lead. Intent: {{answers.intent}}. Frustration: {{answers.frustration}}.\n\n{{input}}",
    }),
    createJevNode({
      id: "tone-check",
      position: { x: COLUMN * 3, y: 0 },
      label: "Tone check",
      questions: [
        {
          id: "apologetic",
          type: "noul",
          instructions:
            "Does `input` clearly apologize for the inconvenience caused to the customer?",
          threshold: 0.6,
        },
      ],
    }),
    createLlmNode({
      id: "rewrite",
      position: { x: COLUMN * 4, y: 0 },
      label: "Rewrite warmer",
      system: "You edit customer support replies.",
      prompt:
        "Rewrite this reply so it opens with a sincere, specific apology. Keep everything else the same.\n\n{{input}}",
    }),
    createOutputNode({
      position: { x: COLUMN * 5, y: ROW },
    }),
  ];

  const edges: WorkflowEdge[] = [
    createWorkflowEdge({
      id: "e-input-triage",
      source: "input",
      sourceHandle: OUT_HANDLE,
      target: "triage",
    }),
    createWorkflowEdge({
      id: "e-triage-billing",
      source: "triage",
      sourceHandle: questionHandleId("intent", "billing"),
      target: "billing-reply",
    }),
    createWorkflowEdge({
      id: "e-triage-technical",
      source: "triage",
      sourceHandle: questionHandleId("intent", "technical"),
      target: "technical-reply",
    }),
    createWorkflowEdge({
      id: "e-triage-escalation-billing",
      source: "triage",
      sourceHandle: questionHandleId("intent", "billing"),
      target: "escalation",
    }),
    createWorkflowEdge({
      id: "e-triage-escalation-urgent",
      source: "triage",
      sourceHandle: questionHandleId("urgent", "yes"),
      target: "escalation",
    }),
    createWorkflowEdge({
      id: "e-billing-tone",
      source: "billing-reply",
      sourceHandle: OUT_HANDLE,
      target: "tone-check",
    }),
    createWorkflowEdge({
      id: "e-tone-rewrite",
      source: "tone-check",
      sourceHandle: questionHandleId("apologetic", "no"),
      target: "rewrite",
    }),
    createWorkflowEdge({
      id: "e-rewrite-output",
      source: "rewrite",
      sourceHandle: OUT_HANDLE,
      target: "output",
      targetHandle: "customer",
    }),
    createWorkflowEdge({
      id: "e-tone-output",
      source: "tone-check",
      sourceHandle: questionHandleId("apologetic", "yes"),
      target: "output",
      targetHandle: "customer",
    }),
    createWorkflowEdge({
      id: "e-technical-output",
      source: "technical-reply",
      sourceHandle: OUT_HANDLE,
      target: "output",
      targetHandle: "customer",
    }),
    createWorkflowEdge({
      id: "e-escalation-output",
      source: "escalation",
      sourceHandle: OUT_HANDLE,
      target: "output",
      targetHandle: "team",
    }),
  ];

  return { nodes, edges };
}
