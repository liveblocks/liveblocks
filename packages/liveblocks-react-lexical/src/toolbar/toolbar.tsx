import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  BoldIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CommentIcon,
  ItalicIcon,
  RedoIcon,
  ShortcutTooltip,
  StrikethroughIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import {
  $createParagraphNode,
  $getSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  createCommand,
  FORMAT_TEXT_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  REDO_COMMAND,
  type TextNode,
  UNDO_COMMAND,
} from "lexical";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { classNames } from "../classnames";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "../comments/floating-composer";
import { getActiveBlockElement } from "../get-active-block-element";
import { useIsCommandRegistered } from "../is-command-registered";
import { isTextFormatActive } from "../is-text-format-active";
import { FloatingToolbarContext } from "./floating-toolbar-context";

export const BLOCK_SELECT_SIDE_OFFSET = 10;
export const FLOATING_ELEMENT_COLLISION_PADDING = 10;

export interface ToolbarSlotProps {
  editor: LexicalEditor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

export interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  children?: ToolbarSlot;
  before?: ToolbarSlot;
  after?: ToolbarSlot;
}

interface ToolbarButtonProps extends ComponentProps<"button"> {
  icon?: ReactNode;
  name: string;
  shortcut?: string;
}

interface ToolbarToggleProps extends ToolbarButtonProps {
  active: boolean;
}

type ToolbarSeparatorProps = ComponentProps<"div">;

interface ToolbarBlockSelectorOption {
  name: string;
  isActive: (
    activeBlockElement: LexicalNode | TextNode | null,
    editor: LexicalEditor
  ) => boolean;
  setActive: (editor: LexicalEditor) => void;
}

interface ToolbarBlockSelectorProps extends ComponentProps<"button"> {
  options?: ToolbarBlockSelectorOption[];
}

export function applyToolbarSlot(
  slot: ToolbarSlot,
  props: ToolbarSlotProps
): ReactNode {
  if (typeof slot === "function") {
    const Component = slot;

    return <Component {...props} />;
  }

  return slot;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon, children, name, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={name} shortcut={shortcut}>
        <Button
          type="button"
          variant="toolbar"
          ref={forwardedRef}
          icon={icon}
          {...props}
        >
          {children}
        </Button>
      </ShortcutTooltip>
    );
  }
);

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  ({ active, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root asChild pressed={active}>
        <ToolbarButton ref={forwardedRef} {...props} />
      </TogglePrimitive.Root>
    );
  }
);

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role="separator"
        aria-orientation="vertical"
        className={classNames("lb-lexical-toolbar-separator", className)}
        {...props}
      />
    );
  }
);

function ToolbarSectionHistory() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );

    return unregister;
  }, [editor]);

  return (
    <>
      <ToolbarButton
        name="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
      />
      <ToolbarButton
        name="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
      />
    </>
  );
}

function ToolbarSectionInline() {
  const [editor] = useLexicalComposerContext();
  const supportsTextFormat = useIsCommandRegistered(FORMAT_TEXT_COMMAND);

  return supportsTextFormat ? (
    <>
      <ToolbarToggle
        name="Bold"
        icon={<BoldIcon />}
        shortcut="Mod-B"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        active={isTextFormatActive(editor, "bold")}
      />

      <ToolbarToggle
        name="Italic"
        icon={<ItalicIcon />}
        shortcut="Mod-I"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        active={isTextFormatActive(editor, "italic")}
      />
      <ToolbarToggle
        name="Underline"
        icon={<UnderlineIcon />}
        shortcut="Mod-U"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        active={isTextFormatActive(editor, "underline")}
      />
      <ToolbarToggle
        name="Strikethrough"
        icon={<StrikethroughIcon />}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        active={isTextFormatActive(editor, "strikethrough")}
      />
      <ToolbarToggle
        name="Inline code"
        icon={<CodeIcon />}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        active={isTextFormatActive(editor, "code")}
      />
    </>
  ) : null;
}

function ToolbarSectionCollaboration() {
  const [editor] = useLexicalComposerContext();
  const supportsThread = useIsCommandRegistered(OPEN_FLOATING_COMPOSER_COMMAND);

  return (
    <>
      {supportsThread ? (
        <ToolbarButton
          name="Add a comment"
          icon={<CommentIcon />}
          onClick={() =>
            editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined)
          }
        >
          Comment
        </ToolbarButton>
      ) : null}
    </>
  );
}

function DefaultToolbarContent() {
  const supportsTextFormat = useIsCommandRegistered(FORMAT_TEXT_COMMAND);
  const supportsThread = useIsCommandRegistered(OPEN_FLOATING_COMPOSER_COMMAND);

  return (
    <>
      <ToolbarSectionHistory />
      {supportsTextFormat ? (
        <>
          <ToolbarSeparator />
          <ToolbarBlockSelector />
          <ToolbarSectionInline />
        </>
      ) : null}
      {supportsThread ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionCollaboration />
        </>
      ) : null}
    </>
  );
}

const INITIAL_COMMANDS_REGISTERED_COMMAND: LexicalCommand<void> = createCommand(
  "INITIAL_COMMANDS_REGISTERED_COMMAND"
);

// Re-renders its surrounding component.
function useRerender() {
  const [, setRerender] = useState(false);

  return useCallback(() => {
    setRerender((toggle) => !toggle);
  }, [setRerender]);
}

function createDefaultBlockSelectorOptions(): ToolbarBlockSelectorOption[] {
  const options: (ToolbarBlockSelectorOption | null)[] = [
    {
      name: "Heading 1",
      isActive: (activeBlock) => {
        if ($isHeadingNode(activeBlock)) {
          const tag = activeBlock.getTag();

          return tag === "h1";
        } else {
          return false;
        }
      },
      setActive: () =>
        $setBlocksType($getSelection(), () => $createHeadingNode("h1")),
    },
    {
      name: "Heading 2",
      isActive: (activeBlock) => {
        if ($isHeadingNode(activeBlock)) {
          const tag = activeBlock.getTag();

          return tag === "h2";
        } else {
          return false;
        }
      },
      setActive: () =>
        $setBlocksType($getSelection(), () => $createHeadingNode("h2")),
    },
    {
      name: "Heading 3",
      isActive: (activeBlock) => {
        if ($isHeadingNode(activeBlock)) {
          const tag = activeBlock.getTag();

          return tag === "h3";
        } else {
          return false;
        }
      },
      setActive: () =>
        $setBlocksType($getSelection(), () => $createHeadingNode("h3")),
    },
    {
      name: "Blockquote",
      isActive: (activeBlock) => activeBlock?.getType() === "quote",
      setActive: () =>
        $setBlocksType($getSelection(), () => $createQuoteNode()),
    },
  ];

  return options.filter(Boolean) as ToolbarBlockSelectorOption[];
}

const blockSelectorTextOption: ToolbarBlockSelectorOption = {
  name: "Text",
  isActive: () => false,
  setActive: () =>
    $setBlocksType($getSelection(), () => $createParagraphNode()),
};

const ToolbarBlockSelector = forwardRef<
  HTMLButtonElement,
  ToolbarBlockSelectorProps
>(({ options, ...props }, forwardedRef) => {
  const floatingToolbarContext = useContext(FloatingToolbarContext);
  const [editor] = useLexicalComposerContext();
  const activeBlockElement = getActiveBlockElement(editor);
  const resolvedOptions = useMemo(() => {
    const resolvedOptions = options ?? createDefaultBlockSelectorOptions();
    return [blockSelectorTextOption, ...resolvedOptions];
  }, [options]);

  const activeOption = useMemo(
    () =>
      resolvedOptions.find((option) =>
        option.isActive(activeBlockElement, editor)
      ) ?? blockSelectorTextOption,
    [activeBlockElement, editor, resolvedOptions]
  );

  const handleOptionChange = (name: string) => {
    const option = resolvedOptions.find((option) => option.name === name);

    if (option) {
      editor.update(() => option.setActive(editor));

      // If present in a floating toolbar, close it on change
      floatingToolbarContext?.close();
    }
  };

  return (
    <SelectPrimitive.Root
      value={activeOption.name}
      onValueChange={handleOptionChange}
    >
      <ShortcutTooltip content="Turn into…">
        <SelectPrimitive.Trigger asChild {...props} ref={forwardedRef}>
          <Button type="button" variant="toolbar">
            <SelectPrimitive.Value>{activeOption.name}</SelectPrimitive.Value>
            <SelectPrimitive.Icon className="lb-dropdown-chevron">
              <ChevronDownIcon />
            </SelectPrimitive.Icon>
          </Button>
        </SelectPrimitive.Trigger>
      </ShortcutTooltip>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={BLOCK_SELECT_SIDE_OFFSET}
          collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
          className="lb-root lb-portal lb-elevation lb-dropdown"
        >
          {resolvedOptions.map((option) => (
            <SelectPrimitive.Item
              key={option.name}
              value={option.name}
              className="lb-dropdown-item"
            >
              <SelectPrimitive.ItemText className="lb-dropdown-item-label">
                {option.name}
              </SelectPrimitive.ItemText>
              {option.name === activeOption.name ? (
                <span className="lb-dropdown-item-chevron">
                  <CheckIcon />
                </span>
              ) : null}
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

export const Toolbar = Object.assign(
  forwardRef<HTMLDivElement, ToolbarProps>(
    (
      { before, after, children = DefaultToolbarContent, className, ...props },
      forwardedRef
    ) => {
      const [editor] = useLexicalComposerContext();
      const [commandsRegistered, setCommandsRegistered] = useState(false);
      const rerender = useRerender();

      const slotProps: ToolbarSlotProps = { editor };

      // Ensures that `useIsCommandRegistered` returns correct values initially.
      // It registers a low-priority one-time command to re-render once all initial commands are registered.
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

      // Re-render when the selection changes to ensure components like toggles are updated.
      useEffect(() => {
        const unregister = editor.registerUpdateListener(({ tags }) => {
          return editor.getEditorState().read(() => {
            // Ignore selection updates related to collaboration
            if (tags.has("collaboration")) return;

            rerender();
          });
        });

        return unregister;
      }, [editor, rerender]);

      return (
        <TooltipProvider>
          <div
            ref={forwardedRef}
            role="toolbar"
            aria-label="Toolbar"
            aria-orientation="horizontal"
            className={classNames("lb-root lb-lexical-toolbar", className)}
            {...props}
          >
            {applyToolbarSlot(before, slotProps)}
            {applyToolbarSlot(children, slotProps)}
            {applyToolbarSlot(after, slotProps)}
          </div>
        </TooltipProvider>
      );
    }
  ),
  {
    Button: ToolbarButton,
    Toggle: ToolbarToggle,
    Separator: ToolbarSeparator,
    SectionHistory: ToolbarSectionHistory,
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
    BlockSelector: ToolbarBlockSelector,
  }
);
