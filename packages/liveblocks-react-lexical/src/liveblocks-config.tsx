import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { ComponentType } from "react";
import * as React from "react";

import { ThreadMarkNode } from "./comments/thread-mark-node";
import type { LiveblocksLexicalInternalConfig } from "./liveblocks-plugin-provider";
import Avatar from "./mentions/avatar";
import { Mention } from "./mentions/mention-component";
import { createMentionNodeFactory } from "./mentions/mention-node";
import * as Suggestions from "./mentions/suggestions";
import User from "./mentions/user";

let liveblocksConfig: LiveblocksLexicalInternalConfig | null = null;

export interface MentionProps {
  /**
   * The mention's user ID.
   */
  userId: string;
}

export interface MentionSuggestionsProps {
  /**
   * The list of suggested user IDs.
   */
  userIds: string[];
}

interface EditorComponents {
  Mention: ComponentType<MentionProps>;
  MentionSuggestions: ComponentType<MentionSuggestionsProps>;
}

export interface LiveblocksConfig {
  /**
   * Whether comments are enabled. Defaults to true.
   */
  comments?: boolean;
  /**
   * The components displayed within the editor.
   */
  components?: Partial<EditorComponents>;
}

const MENTION_CHARACTER = "@";
const defaultComponents: EditorComponents = {
  Mention: ({ userId }) => {
    return (
      <Mention className="lb-lexical-mention">
        {MENTION_CHARACTER}
        <User userId={userId} />
      </Mention>
    );
  },
  MentionSuggestions: ({ userIds }) => {
    return (
      <Suggestions.List className="lb-lexical-suggestions-list">
        {userIds.map((userId) => (
          <Suggestions.Item
            key={userId}
            value={userId}
            className="lb-lexical-suggestions-list-item"
          >
            <Avatar
              userId={userId}
              className="lb-lexical-mention-suggestion-avatar"
            />
            <User
              userId={userId}
              className="lb-lexical-mention-suggestion-user"
            />
          </Suggestions.Item>
        ))}
      </Suggestions.List>
    );
  },
};

export function liveblocksLexicalConfig(
  editorConfig: InitialConfigType,
  config: LiveblocksConfig = {}
) {
  const { comments = true, components = {} } = config;

  const nodes = [...(editorConfig.nodes ?? [])];

  const Mention = components.Mention ?? defaultComponents.Mention;
  const MentionSuggestions =
    components.MentionSuggestions ?? defaultComponents.MentionSuggestions;

  const mentionFactory = createMentionNodeFactory(Mention);

  nodes.push(ThreadMarkNode, mentionFactory.MentionNode);

  liveblocksConfig = {
    comments,
    mentions: {
      factory: mentionFactory,
      components: {
        MentionSuggestions,
      },
    },
  };

  return {
    ...editorConfig,
    nodes,
    editorState: null, // explicitly null because CollabProvider requires it
  };
}

export function getLiveblocksLexicalConfig(): LiveblocksLexicalInternalConfig {
  if (liveblocksConfig === null) {
    throw new Error("Liveblocks config is not initialized.");
  }
  return {
    ...liveblocksConfig,
  };
}
