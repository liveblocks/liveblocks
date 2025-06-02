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
type AiMessageContentToolInvocationPartProps = {
  /** @internal */
  index: number;
  /** @internal */
  isStreaming: boolean;
  part: AiToolInvocationPart;
  children: React.ReactNode;
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
