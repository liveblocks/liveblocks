import type {
  AiAssistantMessage,
  AiChatMessage,
  AiReasoningPart,
  AiRetrievalPart,
  AiSourcesPart,
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
  message: AiAssistantMessage;
  part: AiToolInvocationPart;
};

/** @internal */
export type AiMessageContentRetrievalPartProps = {
  /** @internal */
  index: number;
  /** @internal */
  isStreaming: boolean;
  part: AiRetrievalPart;
};

/** @internal */
export type AiMessageContentSourcesPartProps = {
  part: AiSourcesPart;
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
   * The component used to display knowledge retrieval parts.
   */
  RetrievalPart: ComponentType<AiMessageContentRetrievalPartProps>;

  /**
   * The component used to display
   */
  SourcesPart: ComponentType<AiMessageContentSourcesPartProps>;

  /**
   * NOTE that ToolInvocationPart is slightly different.
   * Tool invocations are typically rendered via the render() method instead.
   * @internal
   */
  ToolInvocationPart: ComponentType<AiMessageContentToolInvocationPartProps>;
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
