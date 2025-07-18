import type { ComponentPropsWithoutRef, FormEvent } from "react";

import type { ComponentPropsWithSlot } from "../../types";

export interface AiComposerFormProps extends ComponentPropsWithSlot<"form"> {
  /**
   * The event handler called when a chat message is submitted.
   */
  onComposerSubmit?: (
    message: {
      /**
       * The submitted message text.
       */
      text: string;
    },
    event: FormEvent<HTMLFormElement>
  ) => void;

  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
}

export interface AiComposerEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "children"> {
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
