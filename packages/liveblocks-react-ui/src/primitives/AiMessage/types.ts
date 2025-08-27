import type {
  AiChatMessage,
  AiReasoningPart,
  AiTextPart,
  AiToolInvocationPart,
} from "@liveblocks/core";
import type { ComponentType } from "react";

import type { ComponentPropsWithSlot } from "../../types";

export type AiMessageContentTextPartProps = {
  /** @internal */
  index: number;
  /** @internal */
  isStreaming: boolean;
  part: AiTextPart;
};

export type AiMessageContentReasoningPartProps = {
  /** @internal */
  index: number;
  /** @internal */
  isStreaming: boolean;
  part: AiReasoningPart;
};

/** @internal */
export type AiMessageContentToolInvocationPartProps = {
  /** @internal */
  index: number;
  /** @internal */
  isStreaming: boolean;
  /** @internal */
  message: AiChatMessage;
  part: AiToolInvocationPart;
};

/** @internal */
export type AiMessageContentKnowledgeRetrievalPartProps = {
  /** @internal */
  search: string;
  /** @internal */
  stage: "receiving" | "executing" | "executed";
};

export interface AiMessageContentComponents {
  /**
   * The component used to display text parts.
   */
  TextPart: ComponentType<AiMessageContentTextPartProps>;

  /**
   * The component used to display reasoning parts.
   */
  ReasoningPart: ComponentType<AiMessageContentReasoningPartProps>;

  /**
   * NOTE that ToolInvocationPart is slightly different.
   * Tool invocations are typically rendered via the render() method instead.
   * @internal
   */
  ToolInvocationPart: ComponentType<AiMessageContentToolInvocationPartProps>;

  /**
   * The component used to display knowledge retrieval parts.
   */
  KnowledgeRetrievalPart: ComponentType<AiMessageContentKnowledgeRetrievalPartProps>;
}

export interface AiMessageContentProps extends ComponentPropsWithSlot<"div"> {
  /**
   * The message contents to display.
   */
  message: AiChatMessage;

  /**
   * Optional overrides for the default components to render each part within
   * the message content.
   */
  components?: Partial<AiMessageContentComponents>;
}
