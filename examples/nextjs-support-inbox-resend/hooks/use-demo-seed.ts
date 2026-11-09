"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateFeed, useCreateFeedMessage } from "@liveblocks/react/suspense";
import { getUsers } from "@/app/database";
import {
  extractMentionedUserIds,
  feedIdForThread,
  previewOf,
  type ConversationMetadata,
} from "@/lib/conversation";
import { DEMO_CONVERSATIONS, type DemoConversation } from "@/lib/demo-data";

const MINUTE = 60_000;

/**
 * Populates an empty inbox with the sample conversations, so the example is
 * a believable, active support inbox from the first load. Only runs in demo
 * mode (`enabled`): an inbox connected to Resend starts empty and fills up
 * from the webhook instead. Feed and message ids are deterministic, so two
 * tabs seeding at the same time can't create duplicates. Demo conversations
 * are tagged `source: "demo"` and replies to them are simulated — nothing is
 * ever emailed.
 */
export function useDemoSeed({
  enabled,
  isEmpty,
  isLoaded,
}: {
  enabled: boolean;
  isEmpty: boolean;
  isLoaded: boolean;
}) {
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const started = useRef(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!enabled || !isLoaded || !isEmpty || started.current) {
      return;
    }
    started.current = true;
    setIsSeeding(true);

    const now = Date.now();
    const agents = getUsers().map((user) => ({
      id: user.id,
      name: user.info.name,
    }));

    Promise.all(
      DEMO_CONVERSATIONS.map(async (conversation) => {
        const feedId = feedIdForThread(`demo-${conversation.id}`);
        const metadata = demoMetadata(conversation, now, agents);
        const createdAt = timestampOf(conversation, 0, now);

        try {
          await createFeed(feedId, { metadata, createdAt });
        } catch {
          // Already seeded by another tab.
          return;
        }

        for (const [index, message] of conversation.messages.entries()) {
          const createdAt = timestampOf(conversation, index, now);
          const id = `demo_${conversation.id}_${index}`;

          if (message.kind === "note") {
            await createFeedMessage(
              feedId,
              {
                kind: "note",
                authorId: message.authorId,
                text: message.text,
                mentionedUserIds: extractMentionedUserIds(message.text, agents),
              },
              { id, createdAt }
            );
            continue;
          }

          const outbound = message.direction === "outbound";
          const author = outbound
            ? agents.find((agent) => agent.id === message.authorId)
            : undefined;

          await createFeedMessage(
            feedId,
            {
              kind: "email",
              direction: message.direction,
              status: "sent",
              failureReason: "",
              resendEmailId: "",
              from: outbound
                ? {
                    name: author?.name ?? "Relay Support",
                    email: "support@relay.example",
                  }
                : {
                    name: conversation.customer.name,
                    email: conversation.customer.email,
                  },
              to: outbound
                ? [conversation.customer.email]
                : ["support@relay.example"],
              cc: [],
              subject: conversation.subject,
              text: message.text,
              attachments: (message.attachments ?? []).map(
                (attachment, attachmentIndex) => ({
                  id: `${id}_att${attachmentIndex}`,
                  filename: attachment.filename,
                  size: attachment.size,
                })
              ),
              authorId: outbound ? (message.authorId ?? "") : "",
              simulated: true,
            },
            { id, createdAt }
          );
        }
      })
    )
      .catch(() => {
        // Best effort: a partially seeded inbox is still usable.
      })
      .finally(() => setIsSeeding(false));
  }, [enabled, isEmpty, isLoaded, createFeed, createFeedMessage]);

  return { isSeeding };
}

function timestampOf(conversation: DemoConversation, index: number, now: number) {
  return now - conversation.messages[index].minutesAgo * MINUTE;
}

function demoMetadata(
  conversation: DemoConversation,
  now: number,
  agents: { id: string; name: string }[]
): ConversationMetadata {
  const emails = conversation.messages.filter(
    (message) => message.kind === "email"
  );
  const latestEmail = emails[emails.length - 1];
  const latest = conversation.messages[conversation.messages.length - 1];
  const mentioned = new Set<string>();
  for (const message of conversation.messages) {
    if (message.kind === "note") {
      for (const id of extractMentionedUserIds(message.text, agents)) {
        mentioned.add(id);
      }
    }
  }

  return {
    source: "demo",
    resendThreadId: `demo-${conversation.id}`,
    resendInboxId: "",
    lastInboundEmailId: "",
    subject: conversation.subject,
    preview: previewOf(latestEmail?.text ?? ""),
    customerName: conversation.customer.name,
    customerEmail: conversation.customer.email,
    customerCompany: conversation.customer.company,
    category: conversation.category,
    status: conversation.status,
    priority: conversation.priority,
    assigneeId: conversation.assigneeId,
    unread: conversation.unread ? "true" : "false",
    lastActivityAt: new Date(now - latest.minutesAgo * MINUTE).toISOString(),
    mentionedUserIds: [...mentioned],
  };
}
