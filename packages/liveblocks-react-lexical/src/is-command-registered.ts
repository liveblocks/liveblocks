import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalCommand } from "lexical";
import { COMMAND_PRIORITY_LOW, createCommand } from "lexical";
import { useEffect, useState } from "react";

const INITIAL_COMMANDS_REGISTERED_COMMAND: LexicalCommand<void> = createCommand(
  "INITIAL_COMMANDS_REGISTERED_COMMAND"
);

/**
 * Checks if a command is registered in the current Lexical editor.
 */
export function useIsCommandRegistered(command: LexicalCommand<unknown>) {
  const [editor] = useLexicalComposerContext();

  return editor._commands.has(command);
}

/**
 * Ensures that `useIsCommandRegistered` returns correct values initially.
 *
 * It registers a low-priority one-time command to re-render once all initial commands are registered.
 */
export function useInitialCommandsRegisteredRerender() {
  const [editor] = useLexicalComposerContext();
  const [commandsRegistered, setCommandsRegistered] = useState(false);

  useEffect(() => {
    if (commandsRegistered) {
      return;
    }

    const unregister = editor.registerCommand(
      INITIAL_COMMANDS_REGISTERED_COMMAND,
      () => {
        setCommandsRegistered(true);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    editor.dispatchCommand(INITIAL_COMMANDS_REGISTERED_COMMAND, undefined);

    return unregister;
  }, [editor, commandsRegistered]);
}
