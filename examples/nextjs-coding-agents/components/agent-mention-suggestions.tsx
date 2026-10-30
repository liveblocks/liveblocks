"use client";

import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { forwardRef, useImperativeHandle } from "react";
import { AI_USER } from "@/lib/agent-user";
import { AGENT_MENTION_LABEL } from "@/lib/mentions";

export type AgentMentionItem = { id: string; label: string };

export type AgentMentionSuggestionsRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

/**
 * The "@" popup. There's only one thing to mention, the agent, so this is
 * a single row: pick it to make sure the message reaches the agent even if
 * it reads like a message to the team.
 */
export const AgentMentionSuggestions = forwardRef<
  AgentMentionSuggestionsRef,
  SuggestionProps<AgentMentionItem, AgentMentionItem>
>(function AgentMentionSuggestions(props, ref) {
  const item = props.items[0];

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if ((event.key === "Enter" || event.key === "Tab") && item) {
        props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (!item) {
    return null;
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-background py-1 shadow-lg">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 bg-panel-active px-3 py-1.5 text-left"
        onMouseDown={(event) => {
          event.preventDefault();
          props.command(item);
        }}
      >
        <img
          src={AI_USER.info.avatar}
          alt=""
          className="size-5 shrink-0 rounded bg-panel"
        />
        <span className="min-w-0 flex-1">
          <span className="text-[13px] font-medium">
            @{AGENT_MENTION_LABEL}
          </span>
          <span className="block truncate text-xs text-muted">
            Make sure the agent responds to this message
          </span>
        </span>
      </button>
    </div>
  );
});
