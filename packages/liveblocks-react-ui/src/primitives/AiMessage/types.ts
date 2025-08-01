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
  /** @internal */
  copilotId?: string;
};

export interface AiMessageContentParts {
  /**
   * The component used to display text parts.
   */
  Text: ComponentType<AiMessageContentTextPartProps>;

  /**
   * The component used to display reasoning parts.
   */
  Reasoning: ComponentType<AiMessageContentReasoningPartProps>;

  /**
   * NOTE that ToolInvocationPart is slightly different.
   * Tool invocations are typically rendered via the render() method instead.
   * @internal
   */
  ToolInvocation: ComponentType<AiMessageContentToolInvocationPartProps>;
}

export interface AiMessageContentProps extends ComponentPropsWithSlot<"div"> {
  /**
   * The message to display.
   */
  message: AiChatMessage;

  /**
   * Override specific message parts.
   */
  parts?: Partial<AiMessageContentParts>;

  /**
   * @internal
   * The id of the copilot to use to set tool call result.
   */
  copilotId?: string;
}
