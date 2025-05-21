import type { AiToolDefinitionRenderProps } from "@liveblocks/core";

/**
 * @experimental
 * Helper to debug tool invocations.
 *
 * Simply drop this into your tool definition's `render` property to visually
 * see what's going on with your tool calls.
 */
export function AiToolDebugger(props: AiToolDefinitionRenderProps) {
  const color =
    props.status === "executed"
      ? "darkgreen"
      : props.status === "executing"
        ? "orange"
        : "gray";
  return (
    <div
      className="lb-ai-chat-message-tool"
      style={{
        border: `2px solid ${color}`,
        padding: "1rem",
      }}
    >
      <div>
        <b>status:</b> <span style={{ color }}>{props.status}</span>
      </div>
      <div>
        <b>name:</b> {props.toolName}
      </div>
      <div>
        {props.partialArgs ? (
          <>
            <b>partialArgs:</b> <code>{JSON.stringify(props.partialArgs)}</code>
          </>
        ) : (
          <>
            <b>args:</b> <code>{JSON.stringify(props.args)}</code>
          </>
        )}
      </div>
      <div>
        <b>result:</b>{" "}
        {props.result ? <code>{JSON.stringify(props.result)}</code> : "—"}
      </div>
    </div>
  );
}
