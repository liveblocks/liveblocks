import type {
  AiChatMessage,
  AiToolInvocationPart,
  AiToolInvocationProps,
  JsonObject,
  ToolResultResponse,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { type FunctionComponent, useCallback, useMemo } from "react";

import { AiToolInvocationContext } from "./contexts";

type OpaqueAiToolInvocationProps = AiToolInvocationProps<
  JsonObject,
  JsonObject
>;

function StableRenderFn(props: {
  renderFn: FunctionComponent<OpaqueAiToolInvocationProps>;
  props: OpaqueAiToolInvocationProps;
}) {
  return props.renderFn(props.props);
}

/**
 * @internal
 *
 * This could become publicly exposed as <AiMessage.ToolInvocation /> in the future,
 * but because namespace exports can't be marked `@internal`, we're keeping it in its
 * own file for now.
 */
export function AiMessageToolInvocation({
  message,
  part,
}: {
  message: AiChatMessage;
  part: AiToolInvocationPart;
}) {
  const client = useClient();
  const ai = client[kInternal].ai;
  const tool = useSignal(ai.signals.getToolΣ(part.name, message.chatId));

  const respond = useCallback(
    (result: ToolResultResponse | undefined) => {
      if (message.status !== "awaiting-tool") {
        // console.log("Ignoring respond(): message not awaiting tool result");
      } else if (part.stage === "receiving") {
        // console.log(
        //   `Ignoring respond(): tool '${part.name}' (${part.invocationId}) is still receiving`
        // );
      } else if (part.stage === "executed") {
        console.log(
          `Ignoring respond(): tool '${part.name}' (${part.invocationId}) has already executed`
        );
      } else {
        ai.setToolResult(
          message.chatId,
          message.id,
          part.invocationId,
          result ?? { data: {} },
          { copilotId: message.copilotId }
        );
      }
    },
    [
      ai,
      message.chatId,
      message.id,
      message.status,
      part.invocationId,
      part.name,
      part.stage,
      message.copilotId,
    ]
  );

  const partialArgs = part?.partialArgs;
  const props = useMemo(() => {
    // NOTE: Not really used, but necessary to trick useMemo into re-evaluating
    // when it changes. Without this trick, tool call streaming won't
    // re-render. The reason this is needed is that `part` gets mutated
    // in-place by the delta handling, rather than part being replaced by a new
    // object on every chunk.
    partialArgs;

    const { type: _, ...rest } = part;
    return {
      ...rest,
      respond,
      types: undefined as never,
      [kInternal]: {
        execute: tool?.execute,
        messageStatus: message.status,
      },
    };
  }, [part, respond, tool?.execute, message.status, partialArgs]);

  if (tool?.render === undefined) return null;
  return (
    <AiToolInvocationContext.Provider value={props}>
      <StableRenderFn
        renderFn={tool.render as FunctionComponent<OpaqueAiToolInvocationProps>}
        props={props}
      />
    </AiToolInvocationContext.Provider>
  );
}
