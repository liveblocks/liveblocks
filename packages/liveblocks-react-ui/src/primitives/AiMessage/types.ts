import type {
  AiChatMessage,
  AiReasoningPart,
  AiTextPart,
} from "@liveblocks/core";
import type { ComponentType } from "react";

import type { ComponentPropsWithSlot } from "../../types";

export interface AiMessageContentComponents {
  /**
   * The component used to display text parts.
   */
  TextPart: ComponentType<{ part: AiTextPart }>;

  /**
   * The component used to display reasoning parts.
   */
  ReasoningPart: ComponentType<{ part: AiReasoningPart }>;

  // NOTE: There is no ToolInvocationPart! This is not a bug. It's deliberate.
  // Tool invocations are typically rendered via the render() method that users
  // implement on the tool definition instead.
  /* ToolInvocationPart: never */
}

export interface AiMessageContentProps
  extends Omit<ComponentPropsWithSlot<"div">, "children"> {
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
