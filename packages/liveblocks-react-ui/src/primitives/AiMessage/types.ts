import type {
  AiChatMessage,
  AiReasoningPart,
  AiTextPart,
  AiToolInvocationPart,
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

  /**
   * NOTE that ToolInvocationPart is slightly different.
   * Tool invocations are typically rendered via the render() method instead.
   * @internal
   */
  ToolInvocationPart: ComponentType<{
    part: AiToolInvocationPart;
    children: React.ReactNode;
  }>;
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
