import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalCommand } from "lexical";

/**
 * Checks if a command is registered in the current Lexical editor.
 */
export function useIsCommandRegistered(command: LexicalCommand<unknown>) {
  const [editor] = useLexicalComposerContext();

  return editor._commands.has(command);
}
