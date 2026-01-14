import {
  BlockquoteIcon,
  BoldIcon,
  Button,
  CheckIcon,
  cn,
  CodeIcon,
  CommentIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  ListOrderedIcon,
  ListUnorderedIcon,
  QuestionMarkIcon,
  RedoIcon,
  SelectButton,
  ShortcutTooltip,
  SparklesIcon,
  StrikethroughIcon,
  TextIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { type Editor, useEditorState } from "@tiptap/react";
import type {
  ComponentProps,
  ComponentType,
  KeyboardEvent,
  ReactNode,
} from "react";
import { forwardRef, useCallback, useContext, useMemo } from "react";

import { EditorProvider, useCurrentEditor } from "../context";
import type { AiExtensionStorage, ExtendedChainedCommands } from "../types";
import { FloatingToolbarContext, FloatingToolbarExternal } from "./shared";

export const BLOCK_SELECT_SIDE_OFFSET = 10;
export const FLOATING_ELEMENT_COLLISION_PADDING = 10;

export interface ToolbarSlotProps {
  editor: Editor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

export interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The Tiptap editor.
   */
  editor: Editor | null;

  /**
   * The content of the toolbar, overriding the default content.
   * Use the `before` and `after` props if you want to keep and extend the default content.
   */
  children?: ToolbarSlot;

  /**
   * The content to display at the start of the toolbar.
   */
  before?: ToolbarSlot;

  /**
   * The content to display at the end of the toolbar.
   */
  after?: ToolbarSlot;
}

export interface ToolbarButtonProps extends ComponentProps<"button"> {
  /**
   * The name of this button displayed in its tooltip.
   */
  name: string;

  /**
   * An optional icon displayed in this button.
   */
  icon?: ReactNode;

  /**
   * An optional keyboard shortcut displayed in this button's tooltip.
   *
   * @example
   * "Mod-Alt-B" → "⌘⌥B" in Apple environments, "⌃⌥B" otherwise
   * "Ctrl-Shift-Escape" → "⌃⇧⎋"
   * "Space" → "␣"
   */
  shortcut?: string;
}

export interface ToolbarToggleProps extends ToolbarButtonProps {
  /**
   * Whether the button is toggled.
   */
  active: boolean;
}

export interface ToolbarBlockSelectorItem {
  /**
   * The name of this block element, displayed as the label of this item.
   */
  name: string;

  /**
   * Optionally replace the name used as the label of this item by any content.
   */
  label?: ReactNode;

  /**
   * An optional icon displayed in this item.
   */
  icon?: ReactNode;

  /**
   * Whether this block element is currently active.
   * Set to `"default"` to display this item when no other item is active.
   */
  isActive: ((editor: Editor) => boolean) | "default";

  /**
   * A callback invoked when this item is selected.
   */
  setActive: (editor: Editor) => void;
}

export interface ToolbarBlockSelectorProps extends ComponentProps<"button"> {
  /**
   * The items displayed in this block selector.
   * When provided as an array, the default items are overridden. To avoid this,
   * a function can be provided instead and it will receive the default items.
   *
   * @example
   * <Toolbar.BlockSelector
   *   items={[
   *     {
   *       name: "Text",
   *       isActive: "default",
   *       setActive: () => { ... },
   *     },
   *     {
   *       name: "Heading 1",
   *       isActive: () => { ... },
   *       setActive: () => { ... },
   *     },
   *   ]}
   * />
   *
   * @example
   * <Toolbar.BlockSelector
   *   items={(defaultItems) => [
   *     ...defaultItems,
   *     {
   *       name: "Custom block",
   *       isActive: () => { ... },
   *       setActive: () => { ... },
   *     },
   *   ]}
   * />
   */
  items?:
    | ToolbarBlockSelectorItem[]
    | ((
        defaultItems: ToolbarBlockSelectorItem[]
      ) => ToolbarBlockSelectorItem[]);
}

export type ToolbarSeparatorProps = ComponentProps<"div">;

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
  ({ icon, children, name, shortcut, onKeyDown, ...props }, forwardedRef) => {
    const floatingToolbarContext = useContext(FloatingToolbarContext);
    const closeFloatingToolbar = floatingToolbarContext?.close;

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);

        if (
          !event.isDefaultPrevented() &&
          closeFloatingToolbar &&
          event.key === "Escape"
        ) {
          closeFloatingToolbar();
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [onKeyDown, closeFloatingToolbar]
    );

    return (
      <ShortcutTooltip content={name} shortcut={shortcut}>
        <Button
          type="button"
          variant="toolbar"
          ref={forwardedRef}
          icon={icon}
          aria-label={!children ? name : undefined}
          // Safari doesn't mark buttons as focusable, which breaks `relatedTarget`
          // in focus/blur events. https://bugs.webkit.org/show_bug.cgi?id=254655
          tabIndex={0}
          {...props}
          onKeyDown={handleKeyDown}
        >
          {!children && !icon ? name : children}
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

function createDefaultBlockSelectorItems(
  editor: Editor
): ToolbarBlockSelectorItem[] {
  const items: (ToolbarBlockSelectorItem | null)[] = [
    {
      name: "Text",
      icon: <TextIcon />,
      isActive: "default",
      setActive: (editor) => editor.chain().focus().clearNodes().run(),
    },
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 1",
          icon: <H1Icon />,
          isActive: (editor) => editor.isActive("heading", { level: 1 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 1 })
              .run(),
        }
      : null,
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 2",
          icon: <H2Icon />,
          isActive: (editor) => editor.isActive("heading", { level: 2 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 2 })
              .run(),
        }
      : null,
    "toggleHeading" in editor.commands
      ? {
          name: "Heading 3",
          icon: <H3Icon />,
          isActive: (editor) => editor.isActive("heading", { level: 3 }),
          setActive: (editor) =>
            (
              editor.chain().focus().clearNodes() as ExtendedChainedCommands<
                "toggleHeading",
                [{ level: number }]
              >
            )
              .toggleHeading({ level: 3 })
              .run(),
        }
      : null,
    "toggleBulletList" in editor.commands
      ? {
          name: "Bullet list",
          icon: <ListUnorderedIcon />,
          isActive: (editor) => editor.isActive("bulletList"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleBulletList">
            )
              .toggleBulletList()
              .run(),
        }
      : null,
    "toggleOrderedList" in editor.commands
      ? {
          name: "Numbered list",
          icon: <ListOrderedIcon />,
          isActive: (editor) => editor.isActive("orderedList"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleOrderedList">
            )
              .toggleOrderedList()
              .run(),
        }
      : null,
    "toggleBlockquote" in editor.commands
      ? {
          name: "Blockquote",
          icon: <BlockquoteIcon />,
          isActive: (editor) => editor.isActive("blockquote"),
          setActive: (editor) =>
            (
              editor
                .chain()
                .focus()
                .clearNodes() as ExtendedChainedCommands<"toggleBlockquote">
            )
              .toggleBlockquote()
              .run(),
        }
      : null,
  ];

  return items.filter(Boolean) as ToolbarBlockSelectorItem[];
}

const ToolbarBlockSelector = forwardRef<
  HTMLButtonElement,
  ToolbarBlockSelectorProps
>(({ items, onKeyDown, ...props }, forwardedRef) => {
  const floatingToolbarContext = useContext(FloatingToolbarContext);
  const closeFloatingToolbar = floatingToolbarContext?.close;
  const editor = useCurrentEditor(
    "BlockSelector",
    "Toolbar or FloatingToolbar"
  );
  const resolvedItems = useMemo(() => {
    if (Array.isArray(items)) {
      return items;
    }

    const defaultItems = createDefaultBlockSelectorItems(editor);

    return items ? items(defaultItems) : defaultItems;
  }, [editor, items]);
  let defaultItem: ToolbarBlockSelectorItem | undefined;
  let activeItem = editor.isInitialized
    ? resolvedItems.find((item) => {
        if (item.isActive === "default") {
          defaultItem = item;
          return false;
        }

        return item.isActive(editor);
      })
    : undefined;

  if (!activeItem) {
    activeItem = defaultItem;
  }

  const handleItemChange = (name: string) => {
    const item = resolvedItems.find((item) => item.name === name);

    if (item) {
      item.setActive(editor);

      // If present in a floating toolbar, close it on change
      floatingToolbarContext?.close();
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);

      if (
        !event.isDefaultPrevented() &&
        closeFloatingToolbar &&
        event.key === "Escape"
      ) {
        closeFloatingToolbar();
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [onKeyDown, closeFloatingToolbar]
  );

  return (
    <SelectPrimitive.Root
      value={activeItem?.name}
      onValueChange={handleItemChange}
    >
      <ShortcutTooltip content="Turn into…">
        <SelectPrimitive.Trigger
          asChild
          {...props}
          ref={forwardedRef}
          onKeyDown={handleKeyDown}
          disabled={resolvedItems.length === 0}
        >
          <SelectButton variant="toolbar">
            {activeItem?.name ?? "Turn into…"}
          </SelectButton>
        </SelectPrimitive.Trigger>
      </ShortcutTooltip>
      <SelectPrimitive.Portal>
        <FloatingToolbarExternal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={BLOCK_SELECT_SIDE_OFFSET}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            className="lb-root lb-portal lb-elevation lb-dropdown lb-select-dropdown lb-tiptap-block-selector-dropdown"
          >
            {resolvedItems.map((item) => (
              <SelectPrimitive.Item
                key={item.name}
                value={item.name}
                className="lb-dropdown-item"
                data-name={item.name}
              >
                {item.icon ? (
                  <span className="lb-dropdown-item-icon lb-icon-container">
                    {item.icon}
                  </span>
                ) : null}
                <span className="lb-dropdown-item-label">
                  {item.label ?? item.name}
                </span>
                {item.name === activeItem?.name ? (
                  <span className="lb-dropdown-item-accessory lb-icon-container">
                    <CheckIcon />
                  </span>
                ) : null}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Content>
        </FloatingToolbarExternal>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role="separator"
        aria-orientation="vertical"
        className={cn("lb-tiptap-toolbar-separator", className)}
        {...props}
      />
    );
  }
);

function ToolbarSectionHistory() {
  const editor = useCurrentEditor(
    "SectionHistory",
    "Toolbar or FloatingToolbar"
  );

  return (
    <>
      <ToolbarButton
        name="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        name="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </>
  );
}

function ToolbarSectionInline() {
  const editor = useCurrentEditor(
    "SectionInline",
    "Toolbar or FloatingToolbar"
  );
  const supportsBold = "toggleBold" in editor.commands;
  const supportsItalic = "toggleItalic" in editor.commands;
  const supportsUnderline = "toggleUnderline" in editor.commands;
  const supportsStrike = "toggleStrike" in editor.commands;
  const supportsCode = "toggleCode" in editor.commands;

  return (
    <>
      {supportsBold && (
        <ToolbarToggle
          name="Bold"
          icon={<BoldIcon />}
          shortcut="Mod-B"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleBold">)
              .toggleBold()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleBold">
            )
              .toggleBold()
              .run()
          }
          active={editor.isActive("bold")}
        />
      )}
      {supportsItalic && (
        <ToolbarToggle
          name="Italic"
          icon={<ItalicIcon />}
          shortcut="Mod-I"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleItalic">)
              .toggleItalic()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleItalic">
            )
              .toggleItalic()
              .run()
          }
          active={editor.isActive("italic")}
        />
      )}
      {supportsUnderline && (
        <ToolbarToggle
          name="Underline"
          icon={<UnderlineIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          active={editor.isActive("underline")}
        />
      )}
      {supportsStrike && (
        <ToolbarToggle
          name="Strikethrough"
          icon={<StrikethroughIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleStrike">)
              .toggleStrike()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleStrike">
            )
              .toggleStrike()
              .run()
          }
          active={editor.isActive("strike")}
        />
      )}
      {supportsCode && (
        <ToolbarToggle
          name="Inline code"
          icon={<CodeIcon />}
          shortcut="Mod-E"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleCode">)
              .toggleCode()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleCode">
            )
              .toggleCode()
              .run()
          }
          active={editor.isActive("code")}
        />
      )}
    </>
  );
}

function ToolbarSectionCollaboration() {
  const editor = useCurrentEditor(
    "SectionCollaboration",
    "Toolbar or FloatingToolbar"
  );
  const supportsThread = "addPendingComment" in editor.commands;

  return (
    <>
      {supportsThread && (
        <ToolbarButton
          name="Add a comment"
          icon={<CommentIcon />}
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"addPendingComment">
            )
              .addPendingComment()
              .run()
          }
        >
          Comment
        </ToolbarButton>
      )}
    </>
  );
}

function ToolbarSectionAi() {
  const editor = useCurrentEditor("SectionAi", "Toolbar or FloatingToolbar");
  const supportsAi = "askAi" in editor.commands;
  const aiName = (editor.storage.liveblocksAi as AiExtensionStorage | undefined)
    ?.name;

  return (
    <>
      {supportsAi && (
        <>
          <ToolbarButton
            name={`Ask ${aiName} anything…`}
            icon={<SparklesIcon />}
            onClick={() =>
              (
                editor.chain().focus() as ExtendedChainedCommands<"askAi">
              ).askAi()
            }
          >
            Ask {aiName}
          </ToolbarButton>
          <ToolbarButton
            name="Explain"
            icon={<QuestionMarkIcon />}
            onClick={() =>
              (
                editor.chain().focus() as ExtendedChainedCommands<"askAi">
              ).askAi("Explain what the text is about")
            }
          >
            Explain
          </ToolbarButton>
        </>
      )}
    </>
  );
}

function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsThread = "addPendingComment" in editor.commands;
  const supportsAi = "askAi" in editor.commands;

  return (
    <>
      <ToolbarSectionHistory />
      <ToolbarSeparator />
      {supportsAi ? (
        <>
          <ToolbarSectionAi />
          <ToolbarSeparator />
        </>
      ) : null}
      <ToolbarBlockSelector />
      <ToolbarSectionInline />
      {supportsThread ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionCollaboration />
        </>
      ) : null}
    </>
  );
}

/**
 * A static toolbar containing actions and values related to the editor.
 *
 * @example
 * <Toolbar editor={editor} />
 *
 * @example
 * <Toolbar editor={editor}>
 *   <Toolbar.BlockSelector />
 *   <Toolbar.Separator />
 *   <Toolbar.SectionInline />
 *   <Toolbar.Separator />
 *   <Toolbar.Button name="Custom action" onClick={() => { ... }} icon={<Icon.QuestionMark />} />
 * </Toolbar>
 */
export const Toolbar = Object.assign(
  forwardRef<HTMLDivElement, ToolbarProps>(
    (
      {
        before,
        after,
        children = DefaultToolbarContent,
        editor,
        className,
        ...props
      },
      forwardedRef
    ) => {
      // Re-render the toolbar when the editor content and selection change.
      useEditorState({
        editor,
        equalityFn: Object.is,
        selector: (ctx) => ctx.editor?.state,
      });

      if (!editor) {
        return null;
      }

      const slotProps: ToolbarSlotProps = { editor };

      return (
        <TooltipProvider>
          <EditorProvider editor={editor}>
            <div
              ref={forwardedRef}
              role="toolbar"
              aria-label="Toolbar"
              aria-orientation="horizontal"
              className={cn("lb-root lb-tiptap-toolbar", className)}
              {...props}
            >
              {applyToolbarSlot(before, slotProps)}
              {applyToolbarSlot(children, slotProps)}
              {applyToolbarSlot(after, slotProps)}
            </div>
          </EditorProvider>
        </TooltipProvider>
      );
    }
  ),
  {
    /**
     * A button for triggering actions.
     *
     * @example
     * <Toolbar.Button name="Comment" shortcut="Mod-Shift-E" onClick={() => { ... }} />
     *
     * @example
     * <Toolbar.Button name="Mention someone" icon={<Icon.Mention />} onClick={() => { ... }} />
     */
    Button: ToolbarButton,

    /**
     * A toggle button for values that can be active or inactive.
     *
     * @example
     * <Toolbar.Toggle name="Bold" active={isBold} />
     *
     * @example
     * <Toolbar.Toggle name="Italic" icon={<Icon.Italic />} shortcut="Mod-I" active={isItalic} onClick={() => { ... }} />
     */
    Toggle: ToolbarToggle,

    /**
     * A dropdown selector to switch between different block types.
     *
     * @example
     * <Toolbar.BlockSelector />
     */
    BlockSelector: ToolbarBlockSelector,

    /**
     * A visual (and accessible) separator to separate sections in a toolbar.
     */
    Separator: ToolbarSeparator,

    /**
     * A section containing history actions. (e.g. undo, redo)
     */
    SectionHistory: ToolbarSectionHistory,

    /**
     * A section containing inline formatting actions. (e.g. bold, italic, underline, ...)
     */
    SectionInline: ToolbarSectionInline,

    /**
     * A section containing collaborative actions. (e.g. adding a comment)
     */
    SectionCollaboration: ToolbarSectionCollaboration,

    /**
     * A section containing AI actions. (e.g. opening the AI toolbar)
     */
    SectionAi: ToolbarSectionAi,
  }
);
