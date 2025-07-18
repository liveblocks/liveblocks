import type { ComponentPropsWithoutRef, FormEvent } from "react";

import type { ComponentPropsWithSlot, Direction } from "../../types";

export interface AiComposerSubmitMessage {
  /**
   * The submitted message text.
   */
  text: string;
}

export interface AiComposerFormProps extends ComponentPropsWithSlot<"form"> {
  /**
   * The event handler called when the composer is submitted.
   */
  onComposerSubmit?: (
    message: AiComposerSubmitMessage,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void> | void;

  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
}

export interface AiComposerEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "children"> {
  /**
   * The reading direction of the editor and related elements.
   */
  dir?: Direction;

  /**
   * The editor's initial value.
   */
  defaultValue?: string;

  /**
   * The text to display when the editor is empty.
   */
  placeholder?: string;

  /**
   * Whether the editor is disabled.
   */
  disabled?: boolean;

  /**
   * Whether to focus the editor on mount.
   */
  autoFocus?: boolean;
}

export type AiComposerSubmitProps = ComponentPropsWithSlot<"button">;
