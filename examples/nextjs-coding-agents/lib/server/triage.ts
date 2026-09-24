import { experimental_evaluate as evaluate } from "ai";
import { AI_USER_ID } from "@/lib/agent-user";
import { mentionsAgent, stripMentionTokens } from "@/lib/mentions";
import { getSkillIdsFromContent, stripSkillTokens } from "@/lib/skills";
import type { ChatFeedMetadata, ChatMessage } from "@/lib/types";

/**
 * Decides whether a human message is for the agent or just people talking
 * to each other, so a chat can double as the team's channel without every
 * "sounds good" starting a cloud agent.
 *
 * Clear cases are settled without a model call: `@AI` and skills always go
 * to the agent. Everything else, including the first message of a chat, is
 * put to Jev (TypeSafe AI's evaluation model) through the AI SDK and Vercel
 * AI Gateway, with the recent conversation as context. Jev returns a
 * probability rather than text, so the cutoff is plain application logic.
 *
 * Fails open: without Gateway credentials, or if the call fails, the message
 * goes to the agent, which is what the app did before triage existed.
 */

const JEV_MODEL_ID = "typesafe-ai/jev";

/** How much of the chat Jev sees before the new message */
const CONTEXT_MESSAGES = 10;
const MAX_TEXT_CHARS = 1_500;

/**
 * Below this probability of being for the agent, a message is left to the
 * team. Set low on purpose: an ignored request is worse than an unneeded
 * run, so anything Jev isn't fairly sure about still reaches the agent.
 */
const SKIP_BELOW_PROBABILITY = 0.35;

export type TriageDecision = {
  forAgent: boolean;
  // How the decision was reached; surfaced in logs and the API response
  reason: "mention" | "skill" | "forced" | "model" | "unavailable";
  probability?: number;
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
}: {
  /** The message just posted */
  message: ChatMessage;
  /** Every message in the chat, in any order */
  messages: ChatMessage[];
  metadata: ChatFeedMetadata;
}): Promise<TriageDecision> {
  const content = message.data.content;
  if (mentionsAgent(content)) {
    return { forAgent: true, reason: "mention" };
  }
  if (getSkillIdsFromContent(content).length > 0) {
    return { forAgent: true, reason: "skill" };
  }

  const earlier = messages
    .filter(
      (other) => other.id !== message.id && other.createdAt <= message.createdAt
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  if (!hasTriageModel()) {
    return { forAgent: true, reason: "unavailable" };
  }

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
      },
      questions: {
        forAgent: {
          type: "boolean",
          instructions: [
            "This is a team chat shared with a coding agent (shown as 'agent'). The agent has no name people use; requests are simply typed into the chat, and it works on the repository, answers questions about the code, and writes documents.",
            "Is `newMessage` meant for the agent? That is: does it ask the agent to do something, answer something, or change, stop, or continue what it is doing, or add requirements to a request it is handling?",
          ].join(" "),
          criteria: {
            true: "A request, question, instruction, or follow-up aimed at the agent, including replies to the agent's questions and messages that add to a request already made to it.",
            false:
              "People talking to each other: reactions, acknowledgements, thanks, jokes, coordination between teammates, or discussion that doesn't ask the agent for anything. Also messages clearly addressed to a named person.",
          },
        },
      },
      providerOptions: {
        gateway: { zeroDataRetention: true },
      },
    });

    const probability = result.answers.forAgent.probability;
    return {
      forAgent: probability >= SKIP_BELOW_PROBABILITY,
      reason: "model",
      probability,
    };
  } catch (error) {
    console.warn("[triage] Jev call failed; sending to the agent", error);
    return { forAgent: true, reason: "unavailable" };
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
