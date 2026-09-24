import { experimental_evaluate as evaluate } from "ai";
import { AI_USER_ID } from "@/lib/agent-user";
import { mentionsAgent, stripMentionTokens } from "@/lib/mentions";
import { getSkillIdsFromContent, stripSkillTokens } from "@/lib/skills";
import type { ChatFeedMetadata, ChatMessage } from "@/lib/types";

/**
 * Decides what a human message calls for, so a chat can double as the
 * team's channel without every "sounds good" starting a cloud agent:
 *
 * - `none`: people talking to each other; nothing happens.
 * - `chat`: a question or request answerable in a reply; a language model
 *   answers straight into the chat (workflows/reply-in-chat.ts).
 * - `code`: needs the Cursor cloud agent, which reads and changes the
 *   repository, opens pull requests, and writes documents
 *   (workflows/run-agent.ts).
 *
 * Clear cases are settled without a model call: a `/` skill is an
 * instruction for the coding agent, so it's `code`. Everything else goes to
 * Jev (TypeSafe AI's evaluation model) through the AI SDK and Vercel AI
 * Gateway, with the recent conversation as context. `@AI` and "Send anyway"
 * only rule out `none`; Jev still picks between a reply and a run. Jev
 * returns probabilities rather than text, so the cutoffs are plain
 * application logic.
 *
 * Fails open: without Gateway credentials, or if the call fails, the message
 * goes to the coding agent, which is what the app did before triage existed.
 */

const JEV_MODEL_ID = "typesafe-ai/jev";

/** How much of the chat Jev sees before the new message */
const CONTEXT_MESSAGES = 10;
const MAX_TEXT_CHARS = 1_500;

/**
 * A message is only left alone when Jev is fairly sure nobody wanted the
 * agent: an ignored request is worse than an unneeded reply. Below this,
 * the more likely of `chat` and `code` wins.
 */
const NONE_MIN_PROBABILITY = 0.65;

export type TriageResponse = "none" | "chat" | "code";

export type TriageDecision = {
  response: TriageResponse;
  // How the decision was reached; surfaced in logs and the API response
  reason: "skill" | "model" | "unavailable";
  probabilities?: Record<TriageResponse, number>;
};

/** Whether Jev can be reached: an AI Gateway key locally, OIDC on Vercel. */
export function hasTriageModel() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
  );
}

export async function triageMessage({
  message,
  messages,
  metadata,
  force = false,
}: {
  /** The message just posted */
  message: ChatMessage;
  /** Every message in the chat, in any order */
  messages: ChatMessage[];
  metadata: ChatFeedMetadata;
  /** The author insists the agent handles it; only rules out `none` */
  force?: boolean;
}): Promise<TriageDecision> {
  const content = message.data.content;
  if (getSkillIdsFromContent(content).length > 0) {
    return { response: "code", reason: "skill" };
  }
  const mustRespond = force || mentionsAgent(content);

  if (!hasTriageModel()) {
    return { response: "code", reason: "unavailable" };
  }

  const earlier = messages
    .filter(
      (other) => other.id !== message.id && other.createdAt <= message.createdAt
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  try {
    const result = await evaluate({
      model: JEV_MODEL_ID,
      state: {
        chat: {
          title: metadata.title,
          hasRepository: Boolean(metadata.repoUrl),
          agentStatus: metadata.agentStatus,
        },
        recentMessages: earlier.slice(-CONTEXT_MESSAGES).map(describeMessage),
        newMessage: describeMessage(message),
        ...(mustRespond ? { newMessageAddressedToAgent: true } : {}),
      },
      questions: {
        response: {
          type: "choice",
          instructions: [
            "This is a team chat shared with an AI agent (shown as 'agent'). The agent has no name people use; requests are simply typed into the chat. It can either answer in the chat, or start a coding session that reads and changes the repository, runs commands, opens pull requests, and writes documents.",
            "What does `newMessage` call for from the agent?",
            mustRespond
              ? "The author addressed the agent explicitly, so `none` is not an option."
              : null,
          ]
            .filter((line) => line !== null)
            .join(" "),
          criteria: {
            none: "Nothing. People are talking to each other: reactions, acknowledgements, thanks, jokes, coordination between teammates, discussion that doesn't ask the agent for anything, or a message clearly addressed to a named person.",
            chat: "A reply in the chat is enough: a question, explanation, opinion, comparison, quick answer, or a request to summarise or clarify something, where nothing needs to be changed in the repository and no document needs to be written or edited.",
            code: "A coding session: changing or adding code, fixing a bug, running or checking something in the repository, opening or updating a pull request, writing or editing a document, or a follow-up that changes, stops, or adds to work the agent is doing.",
          },
        },
      },
      providerOptions: {
        gateway: { zeroDataRetention: true },
      },
    });

    const answer = result.answers.response;
    const probabilities: Record<TriageResponse, number> = {
      none: answer.probabilities?.none ?? (answer.choice === "none" ? 1 : 0),
      chat: answer.probabilities?.chat ?? (answer.choice === "chat" ? 1 : 0),
      code: answer.probabilities?.code ?? (answer.choice === "code" ? 1 : 0),
    };

    let response: TriageResponse;
    if (!mustRespond && probabilities.none >= NONE_MIN_PROBABILITY) {
      response = "none";
    } else {
      response = probabilities.code >= probabilities.chat ? "code" : "chat";
    }
    return { response, reason: "model", probabilities };
  } catch (error) {
    console.warn(
      "[triage] Jev call failed; sending to the coding agent",
      error
    );
    return { response: "code", reason: "unavailable" };
  }
}

function describeMessage(message: ChatMessage) {
  if (message.data.role === "agent") {
    return {
      from: "agent",
      text: truncate(agentReplyText(message)),
      ...(message.data.status === "running" ? { stillWorking: true } : {}),
    };
  }
  return {
    from: message.data.userId === AI_USER_ID ? "agent" : message.data.userId,
    text: truncate(stripMentionTokens(stripSkillTokens(message.data.content))),
    ...(message.data.forAgent === false ? { wasForTeamOnly: true } : {}),
  };
}

/** The agent's final reply text, or what it's doing if still running */
function agentReplyText(message: ChatMessage) {
  const parts = message.data.parts ?? [];
  const text = parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (text) {
    return text;
  }
  const status = parts.findLast((part) => part.type === "status");
  return status?.text ?? "(working)";
}

function truncate(text: string) {
  return text.length > MAX_TEXT_CHARS
    ? `${text.slice(0, MAX_TEXT_CHARS)}…`
    : text;
}
