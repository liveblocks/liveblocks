import { z } from "zod";
import { AI_USER } from "@/app/database";
import { getChatFeedId } from "@/components/chat/feed";
import { getLanguage } from "@/lib/languages";
import { liveblocks } from "@/lib/liveblocks-server";
import type { AiAction, DocumentType } from "@/liveblocks.config";
import {
  aiShapeSchema,
  describeCanvas,
  drawOnCanvas,
  readCanvas,
} from "./canvas";
import {
  createDocument,
  listDocuments,
  type DocumentSummary,
} from "./documents";
import { hideAiPresence, showAiPresence } from "./presence";
import {
  describeTextDocument,
  readTextDocument,
  writeTextDocument,
} from "./text-doc";

// Everything the assistant needs to know about the request. The chat history
// comes from the client (it already has it); the room, documents, and the
// contents of the documents are read from Liveblocks on the server.
export type AssistantRequest = {
  roomId: string;
  // The lesson's title, as shown in the room header (the members' names)
  title: string;
  // Language code of the language being taught, see `lib/languages.ts`
  language: string;
  // When the lesson room was created
  createdAt: string;
  // The document the person asking is looking at, if any
  activeDocId: string | null;
  // The most recent chat messages, oldest first, ending with the request
  history: { userId: string; name: string; content: string }[];
  // People in the room, for the system prompt
  members: { id: string; name: string; role: "tutor" | "student" }[];
};

// How long the AI keeps hanging around its last edit before leaving
const LINGER_MS = 2500;
// Don't update the feed message more often than this while streaming
const FLUSH_INTERVAL_MS = 100;

export async function runAssistant(request: AssistantRequest) {
  const { roomId } = request;
  const feedId = getChatFeedId(roomId);
  const documents = await listDocuments(roomId);

  // The reply is a regular chat message from the AI user that gets updated
  // as the answer streams in and as edits are made.
  await liveblocks
    .createFeed({ roomId, feedId: feedId, metadata: { type: "chat" } })
    .catch(() => {
      // Already exists
    });
  const reply = new StreamingReply(
    roomId,
    (
      await liveblocks.createFeedMessage({
        roomId,
        feedId: feedId,
        data: {
          kind: "text",
          userId: AI_USER.id,
          content: "",
          streaming: true,
          status: "Thinking…",
        },
      })
    ).id
  );

  const tools = createTools(roomId, documents, reply);
  try {
    if (process.env.AI_GATEWAY_API_KEY) {
      await streamRealReply(request, documents, tools, reply);
    } else {
      await streamMockReply(request, documents, tools, reply);
    }
    await reply.finish();
  } catch (error) {
    console.error("[ai] Assistant run failed", error);
    const reason = error instanceof Error ? error.message : "Unknown error";
    await reply.finish(`Sorry, something went wrong.\n\n${reason}`);
  } finally {
    await sleep(LINGER_MS);
    await hideAiPresence(roomId);
  }
}

// ---------------------------------------------------------------------------
// The reply message
// ---------------------------------------------------------------------------

class StreamingReply {
  content = "";
  status: string | undefined = "Thinking…";
  actions: AiAction[] = [];
  #lastFlush = 0;
  #pending: Promise<unknown> = Promise.resolve();

  constructor(
    private roomId: string,
    private messageId: string
  ) {}

  append(text: string) {
    this.content += text;
    this.status = undefined;
    return this.flush();
  }

  setStatus(status: string) {
    this.status = status;
    return this.flush(true);
  }

  addAction(action: AiAction) {
    this.actions.push(action);
    return this.flush(true);
  }

  async finish(content?: string) {
    if (content !== undefined) {
      this.content = content;
    }
    this.status = undefined;
    await this.#pending;
    await this.#update(false);
  }

  private flush(force = false) {
    const now = Date.now();
    if (!force && now - this.#lastFlush < FLUSH_INTERVAL_MS) {
      return this.#pending;
    }
    this.#lastFlush = now;
    // Serialize updates so an older snapshot never overwrites a newer one
    this.#pending = this.#pending.then(() => this.#update(true));
    return this.#pending;
  }

  #update(streaming: boolean) {
    return liveblocks
      .updateFeedMessage({
        roomId: this.roomId,
        feedId: getChatFeedId(this.roomId),
        messageId: this.messageId,
        data: {
          kind: "text",
          userId: AI_USER.id,
          content: this.content,
          ...(streaming ? { streaming: true } : {}),
          ...(this.status && streaming ? { status: this.status } : {}),
          ...(this.actions.length > 0 ? { actions: [...this.actions] } : {}),
        },
      })
      .catch(() => {
        // Keep going; the next update will catch up
      });
  }
}

// ---------------------------------------------------------------------------
// Tools: what the assistant can do to documents
// ---------------------------------------------------------------------------

function createTools(
  roomId: string,
  documents: DocumentSummary[],
  reply: StreamingReply
) {
  function getDocument(docId: string, types: DocumentType[]) {
    const doc = documents.find((candidate) => candidate.id === docId);
    if (!doc) {
      const known = documents.map((d) => `"${d.title}" = ${d.id}`).join(", ");
      throw new Error(
        `Unknown document id "${docId}". Ids are opaque; use one of the existing ids (${known || "none"}) or create the document first with createDocument and use the id it returns.`
      );
    }
    if (!types.includes(doc.type)) {
      throw new Error(
        `"${doc.title}" is a ${doc.type} document, this tool only works on ${types.join("/")} documents`
      );
    }
    return doc;
  }

  const docIdSchema = z
    .string()
    .describe("The document id, from the list of documents in the room");

  return {
    createDocument: {
      description:
        "Create a new, empty text document or whiteboard in the lesson. A document must exist before you can write to or draw on it: call this first and use the id it returns (ids are generated; never make one up). Create one document per topic when asked for several (e.g. vocabulary, grammar, homework). PDFs can't be created.",
      inputSchema: z.object({
        type: z.enum(["text", "whiteboard"]),
        title: z.string().min(1).max(80),
      }),
      execute: async ({
        type,
        title,
      }: {
        type: "text" | "whiteboard";
        title: string;
      }) => {
        await reply.setStatus(`Creating ${title}…`);
        const doc = await createDocument(roomId, type, title);
        documents.push(doc);
        await showAiPresence(roomId, { docId: doc.id });
        await reply.addAction({ docId: doc.id, label: `Created ${doc.title}` });
        return `Created ${type} document "${doc.title}" with id ${doc.id}.`;
      },
    },
    readTextDocument: {
      description:
        "Read a text document. Returns its blocks, numbered from 0; use these numbers with writeTextDocument.",
      inputSchema: z.object({ docId: docIdSchema }),
      execute: async ({ docId }: { docId: string }) => {
        const doc = getDocument(docId, ["text"]);
        await reply.setStatus(`Reading ${doc.title}…`);
        await showAiPresence(roomId, { docId });
        return describeTextDocument(await readTextDocument(roomId, docId));
      },
    },
    writeTextDocument: {
      description: [
        "Write Markdown into a text document. Supports headings, paragraphs, lists, **bold**, *italic*, and GitHub-style tables (use tables for conjugations and vocabulary).",
        "`append` adds at the end, `insert` adds before block `at`, `replace` swaps blocks `at`..`to` (inclusive) for the new content, e.g. to translate or correct them.",
      ].join(" "),
      inputSchema: z.object({
        docId: docIdSchema,
        markdown: z.string().min(1),
        mode: z.enum(["append", "insert", "replace"]),
        at: z.number().int().min(0).optional(),
        to: z.number().int().min(0).optional(),
      }),
      execute: async ({
        docId,
        markdown,
        mode,
        at,
        to,
      }: {
        docId: string;
        markdown: string;
        mode: "append" | "insert" | "replace";
        at?: number;
        to?: number;
      }) => {
        const doc = getDocument(docId, ["text"]);
        await reply.setStatus(`Writing in ${doc.title}…`);
        await showAiPresence(roomId, { docId });
        const result = await writeTextDocument(roomId, docId, markdown, {
          mode,
          at,
          to,
        });
        await reply.addAction({
          docId,
          label:
            mode === "replace"
              ? `Rewrote part of ${doc.title}`
              : `Added to ${doc.title}`,
        });
        return `Done: ${result.insertedBlocks} block(s) written with mode "${mode}".`;
      },
    },
    readCanvas: {
      description:
        "Read a whiteboard or PDF document: its pages (for PDFs) and existing drawings, with coordinates.",
      inputSchema: z.object({ docId: docIdSchema }),
      execute: async ({ docId }: { docId: string }) => {
        const doc = getDocument(docId, ["whiteboard", "pdf"]);
        await reply.setStatus(`Looking at ${doc.title}…`);
        await showAiPresence(roomId, { docId });
        return describeCanvas(await readCanvas(roomId, docId));
      },
    },
    drawOnCanvas: {
      description: [
        "Draw shapes, text, arrows, highlights, or freehand strokes on a whiteboard or on top of a PDF page.",
        "Coordinates are in pixels, y pointing down. On a PDF, set `page` and give coordinates relative to that page's top-left corner (read the canvas first for page sizes).",
        "On a whiteboard, read the canvas first and draw next to existing content; start around (100, 100) on an empty board.",
      ].join(" "),
      inputSchema: z.object({
        docId: docIdSchema,
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("PDF page number. Leave out on whiteboards."),
        shapes: z.array(aiShapeSchema).min(1).max(40),
      }),
      execute: async ({
        docId,
        page,
        shapes,
      }: {
        docId: string;
        page?: number;
        shapes: z.infer<typeof aiShapeSchema>[];
      }) => {
        const doc = getDocument(docId, ["whiteboard", "pdf"]);
        if (page !== undefined && doc.type !== "pdf") {
          throw new Error("`page` is only for PDF documents");
        }
        await reply.setStatus(`Drawing on ${doc.title}…`);
        await showAiPresence(roomId, { docId });
        const result = await drawOnCanvas(roomId, docId, shapes, page);
        await reply.addAction({
          docId,
          label: `Drew on ${doc.title}${page ? `, page ${page}` : ""}`,
        });
        return `Done: ${result.drawnShapes} shape(s) drawn.`;
      },
    },
  };
}

type Tools = ReturnType<typeof createTools>;

// ---------------------------------------------------------------------------
// The real thing, through the Vercel AI Gateway
// ---------------------------------------------------------------------------

async function streamRealReply(
  request: AssistantRequest,
  documents: DocumentSummary[],
  tools: Tools,
  reply: StreamingReply
) {
  // Imported lazily so the example still builds and runs without an API key
  const { stepCountIs, streamText, tool } = await import("ai");

  const result = streamText({
    model: "openai/gpt-5.4-mini",
    system: buildSystemPrompt(request, documents),
    messages: request.history.map((message) => ({
      role:
        message.userId === AI_USER.id
          ? ("assistant" as const)
          : ("user" as const),
      content:
        message.userId === AI_USER.id
          ? message.content
          : `${message.name}: ${message.content}`,
    })),
    tools: {
      createDocument: tool(tools.createDocument),
      readTextDocument: tool(tools.readTextDocument),
      writeTextDocument: tool(tools.writeTextDocument),
      readCanvas: tool(tools.readCanvas),
      drawOnCanvas: tool(tools.drawOnCanvas),
    },
    stopWhen: stepCountIs(12),
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
  });

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      await reply.append(part.text);
    } else if (part.type === "tool-call") {
      console.log("[ai] tool call", part.toolName, JSON.stringify(part.input));
    } else if (part.type === "tool-error") {
      console.error(
        "[ai] tool error",
        part.toolName,
        part.error instanceof Error ? part.error.message : part.error
      );
    } else if (part.type === "finish-step") {
      console.log("[ai] step finished:", part.finishReason);
    } else if (part.type === "error") {
      throw part.error instanceof Error
        ? part.error
        : new Error(String(part.error));
    }
  }
}

function buildSystemPrompt(
  request: AssistantRequest,
  documents: DocumentSummary[]
) {
  const language = getLanguage(request.language);
  const active = documents.find((doc) => doc.id === request.activeDocId);
  const tutors = request.members.filter((member) => member.role === "tutor");
  const students = request.members.filter(
    (member) => member.role === "student"
  );
  const asker = request.history.at(-1);
  const names = (members: typeof request.members) =>
    members.length > 0 ? members.map((m) => m.name).join(", ") : "(none yet)";
  const date = (value: string | number) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return [
    `You are the AI assistant in a ${language.name} lesson between a tutor and their student. You're mentioned as @AI Assistant in the lesson chat. You have tools to create documents in the lesson (createDocument), write Markdown into text documents (writeTextDocument), and draw on whiteboards and PDFs (drawOnCanvas), and you're expected to use them: people mention you to get work done in the documents, not to be told how to do it themselves.`,
    "",
    "The lesson:",
    `- Title: "${request.title}"`,
    `- Language being taught: ${language.name} (${language.code})`,
    `- Tutor: ${names(tutors)}`,
    `- Student: ${names(students)}`,
    `- Lesson room created on ${date(request.createdAt)}; today is ${date(Date.now())}`,
    ...(asker ? [`- You were just mentioned by ${asker.name}`] : []),
    "",
    "Guidelines:",
    `- The language being learned is ${language.name}. Lesson material (exercises, examples, vocabulary, conjugations) is in ${language.name}, with translations or explanations in the language the person wrote to you in.`,
    "- Your chat replies are in the language of the message that mentioned you: if it was written in English, reply in English, even though the lesson is about another language.",
    "- When asked to add, write, translate, correct, or explain something, edit the relevant document with the tools instead of only replying in chat. Read a document before changing or translating existing content.",
    "- You can create new text documents and whiteboards. When asked to set up or prepare a lesson, or for material on several topics, create one document per topic (e.g. Lesson plan, Vocabulary, Grammar, Homework), give each a short clear title, and fill each one in.",
    "- Act rather than ask. If a request is open-ended, make sensible choices for a lesson at the student's likely level and do the work; mention your assumptions in one short sentence afterwards. Only ask a question when the request can't be acted on at all.",
    "- Conjugations and vocabulary go in tables (pronoun | form, or word | translation).",
    "- Drawings should be simple and legible: a few shapes, short labels. To point something out on a PDF, circle it with an ellipse or draw an arrow, and add a short text label next to it.",
    "- Once the edits are done, reply in one or two short sentences saying what you did. Don't repeat the content you wrote into a document. Plain text only, no Markdown.",
    "- If the request doesn't need a document edit, just answer briefly in chat.",
    "",
    "People in the room:",
    ...request.members.map(
      (member) => `- ${member.name} (${member.role}, id ${member.id})`
    ),
    "",
    "Documents in the room:",
    ...(documents.length === 0
      ? [
          "- none yet. Create whatever the request needs with createDocument; never ask the user to create a document for you.",
        ]
      : documents.map(
          (doc) =>
            `- "${doc.title}" (${doc.type}${doc.pageCount ? `, ${doc.pageCount} pages` : ""}, id ${doc.id})${doc.id === active?.id ? " ← currently open, use this one unless told otherwise" : ""}`
        )),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Keyless mode: a canned demo so the example works without an API key
// ---------------------------------------------------------------------------

const MOCK_TABLES: Record<string, { verb: string; rows: [string, string][] }> =
  {
    it: {
      verb: "essere (to be)",
      rows: [
        ["io", "sono"],
        ["tu", "sei"],
        ["lui / lei", "è"],
        ["noi", "siamo"],
        ["voi", "siete"],
        ["loro", "sono"],
      ],
    },
    es: {
      verb: "ser (to be)",
      rows: [
        ["yo", "soy"],
        ["tú", "eres"],
        ["él / ella", "es"],
        ["nosotros", "somos"],
        ["vosotros", "sois"],
        ["ellos", "son"],
      ],
    },
    fr: {
      verb: "être (to be)",
      rows: [
        ["je", "suis"],
        ["tu", "es"],
        ["il / elle", "est"],
        ["nous", "sommes"],
        ["vous", "êtes"],
        ["ils / elles", "sont"],
      ],
    },
    de: {
      verb: "sein (to be)",
      rows: [
        ["ich", "bin"],
        ["du", "bist"],
        ["er / sie / es", "ist"],
        ["wir", "sind"],
        ["ihr", "seid"],
        ["sie", "sind"],
      ],
    },
    pt: {
      verb: "ser (to be)",
      rows: [
        ["eu", "sou"],
        ["tu", "és"],
        ["ele / ela", "é"],
        ["nós", "somos"],
        ["vós", "sois"],
        ["eles", "são"],
      ],
    },
    en: {
      verb: "to be",
      rows: [
        ["I", "am"],
        ["you", "are"],
        ["he / she / it", "is"],
        ["we", "are"],
        ["you (plural)", "are"],
        ["they", "are"],
      ],
    },
  };

async function streamMockReply(
  request: AssistantRequest,
  documents: DocumentSummary[],
  tools: Tools,
  reply: StreamingReply
) {
  const note =
    "I'm running in demo mode, without an AI_GATEWAY_API_KEY, so I can only show you what I'd do. ";

  // Work on the open document, or create one if the room has none yet
  let doc =
    documents.find((candidate) => candidate.id === request.activeDocId) ??
    documents[0];
  if (!doc) {
    await tools.createDocument.execute({ type: "text", title: "Lesson notes" });
    doc = documents[documents.length - 1];
  }

  if (doc.type === "text") {
    const table = MOCK_TABLES[request.language] ?? MOCK_TABLES.it;
    await tools.writeTextDocument.execute({
      docId: doc.id,
      mode: "append",
      markdown: [
        `### ${table.verb}`,
        "",
        "| Pronoun | Form |",
        "| --- | --- |",
        ...table.rows.map(([pronoun, form]) => `| ${pronoun} | ${form} |`),
      ].join("\n"),
    });
    await streamWords(
      reply,
      `${note}I added a conjugation table for ${table.verb} to ${doc.title}. With a key configured, I can translate, correct, or write anything you ask for.`
    );
    return;
  }

  const canvas = await readCanvas(request.roomId, doc.id);
  const page = canvas.pages[0];
  const x = page ? page.w * 0.12 : 120;
  const y = page ? page.h * 0.1 : 120;
  await tools.drawOnCanvas.execute({
    docId: doc.id,
    page: page?.page,
    shapes: [
      { kind: "ellipse", x, y, w: 220, h: 64 },
      { kind: "arrow", x1: x + 300, y1: y + 110, x2: x + 230, y2: y + 60 },
      { kind: "text", x: x + 310, y: y + 100, text: "Demo annotation" },
    ],
  });
  await streamWords(
    reply,
    `${note}I circled a spot on ${doc.title} and labelled it. With a key configured, I can annotate what you point me to.`
  );
}

async function streamWords(reply: StreamingReply, text: string) {
  for (const word of text.split(/(?<=\s)/)) {
    await reply.append(word);
    await sleep(25);
  }
}

// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
