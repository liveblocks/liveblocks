import { useGesture } from "@use-gesture/react";
import cx from "classnames";
import {
  type CSSProperties,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  useEffect,
} from "react";
import { sanitize } from "dompurify";
import {
  motion,
  animate,
  useMotionValue,
  AnimationPlaybackControls,
} from "framer-motion";
import { COLORS } from "../constants";
import { useHistory, useSelf } from "../liveblocks.config";
import tokenizer, {
  SyntaxKind,
  tokenToString,
} from "../spreadsheet/interpreter/tokenizer";
import { EXPRESSION_ERROR } from "../spreadsheet/interpreter/utils";
import type { UserInfo } from "../types";
import { appendUnit } from "../utils/appendUnit";
import { removeGlobalCursor, setGlobalCursor } from "../utils/globalCursor";
import { isNumerical } from "../utils/isNumerical";
import { useInitialRender } from "../utils/useInitialRender";
import { shuffle } from "../utils/shuffle";
import styles from "./Cell.module.css";

export interface Props extends Omit<ComponentProps<"td">, "onSelect"> {
  value: string;
  expression: string;
  cellId: string;
  height: number;
  isSelected?: boolean;
  isEditing?: boolean;
  onStartEditing: () => void;
  onEndEditing: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onCommit: (value: string, direction?: "down") => void;
  other?: UserInfo;
  width: number;
}

export interface EditingCellProps extends ComponentPropsWithoutRef<"div"> {
  expression: string;
  cellId: string;
  onEndEditing: () => void;
  onCommit: (value: string, direction?: "down") => void;
}

export interface DisplayCellProps extends ComponentProps<"div"> {
  value: string;
  expression?: string;
  isSelected?: boolean;
  onCommit?: (value: string, direction?: "down") => void;
}

export interface ScrubbableValueTypeProps extends ComponentProps<"div"> {
  expression: string;
  onCommit: (value: string, direction?: "down") => void;
}

type ExpressionType = "functional" | "numerical" | "alphabetical" | "empty";

export function formatValue(value: string) {
  return value
    .replace(/(\s|\r|\n|&nbsp;)/g, value.startsWith("=") ? "" : " ")
    .replace(/([A-Za-z]\d)/g, (cell) => cell.toUpperCase());
}

export function unformatValue(value: string) {
  return value.replaceAll(" ", "&nbsp;");
}

function getCaretPosition(element: HTMLElement | Node) {
  const selection = window.getSelection();

  if (selection !== null && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const prefix = range.cloneRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(range.endContainer, range.endOffset);

    return prefix.toString().length;
  }
}

function setCaretPosition(element: HTMLElement | Node, position: number) {
  for (const node of element.childNodes) {
    if (node.nodeType == Node.TEXT_NODE) {
      const length = node.nodeValue?.length ?? 0;

      if (length >= position) {
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(node, position);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);

        return -1;
      } else {
        position = position - length;
      }
    } else {
      position = setCaretPosition(node, position);

      if (position < 0) {
        return position;
      }
    }
  }

  return position;
}

function scrollCaretIntoView() {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (range.commonAncestorContainer === document) {
    return;
  }

  const element = document.createElement("br");
  range.insertNode(element);

  element.scrollIntoView({
    block: "end",
  });

  element.remove();
}

function ScrubbableValueType({
  expression,
  onCommit,
  className,
  ...props
}: ScrubbableValueTypeProps) {
  const history = useHistory();
  const initialValue = useRef<number>();

  const bindScrubEvents = useGesture(
    {
      onDragStart: () => {
        initialValue.current = Number.parseFloat(expression ?? "");
        history.pause();
        setGlobalCursor("scrubbing");
      },
      onDrag: ({ movement: [x] }) => {
        onCommit(String((initialValue.current ?? 0) + Math.round(x / 20)));
      },
      onDragEnd: () => {
        history.resume();
        removeGlobalCursor("scrubbing");
      },
    },
    {
      drag: {
        preventDefault: true,
        filterTaps: true,
      },
    }
  );

  return (
    <div
      className={cx(className, styles.value_type, "scrubbable")}
      {...bindScrubEvents()}
      {...props}
    >
      123
    </div>
  );
}

export function EditingCell({
  expression,
  cellId,
  onCommit,
  onEndEditing,
  className,
  ...props
}: EditingCellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInitialRender = useInitialRender();
  const stringToTokenizedHtml = useCallback(
    (value: string) => {
      const colors = shuffle(COLORS, cellId);
      let cellIndex = 0;

      try {
        const tokens = tokenizer(value);
        const html = tokens
          .map((token) => {
            const value = tokenToString(token);

            if (token.kind === SyntaxKind.CellToken) {
              const color = colors[cellIndex % colors.length];
              cellIndex += 1;

              return `<span class="token ${token.kind}" style="--token-color: ${color};">${value}</span>`;
            } else {
              return `<span class="token ${token.kind}">${value}</span>`;
            }
          })
          .join("");

        return sanitize(html);
      } catch {
        return sanitize(`<span>${unformatValue(value)}</span>`);
      }
    },
    [cellId]
  );

  const [draft, setDraft] = useState<string>(() => expression);

  const handleInput = useCallback((event: FormEvent<HTMLDivElement>) => {
    const value = event.currentTarget.innerText;
    setDraft(value);
  }, []);

  const handleBlur = useCallback(() => {
    onCommit(draft);
  }, [draft, onCommit]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();

        onEndEditing();
      } else if (event.key === "Enter") {
        event.preventDefault();

        onCommit(draft, "down");
      }
    },
    [draft, onCommit, onEndEditing]
  );

  useEffect(() => {
    if (!ref.current) return;

    const formattedValue = formatValue(draft);
    const position = getCaretPosition(ref.current);

    ref.current.innerHTML = stringToTokenizedHtml(formattedValue);

    if (isInitialRender) {
      setCaretPosition(ref.current, formattedValue.length);
      scrollCaretIntoView();
    } else {
      setCaretPosition(ref.current, position ?? formattedValue.length);
    }

    ref.current.focus();
  }, [draft]);

  return (
    <div
      ref={ref}
      contentEditable
      spellCheck={false}
      className={cx(className, styles.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      {...props}
    />
  );
}

export function DisplayCell({
  value,
  expression,
  isSelected,
  className,
  onCommit,
  ...props
}: DisplayCellProps) {
  const highlightOpacity = useMotionValue(0);
  const highlightAnimationControls = useRef<AnimationPlaybackControls>();
  const isInitialRender = useInitialRender();
  const isError = useMemo(() => value === EXPRESSION_ERROR, [value]);
  const isNumericalValue = useMemo(() => isNumerical(value), [value]);
  const type: ExpressionType = useMemo(() => {
    if (!expression) {
      return "empty";
    } else if (expression?.startsWith("=")) {
      return "functional";
    } else if (isNumerical(expression)) {
      return "numerical";
    } else {
      return "alphabetical";
    }
  }, [expression, isSelected]);

  useEffect(() => {
    if (isInitialRender) return;

    if (highlightAnimationControls.current) {
      highlightAnimationControls.current.stop();
    }

    highlightOpacity.set(1);
    highlightAnimationControls.current = animate(highlightOpacity, 0, {
      ease: "easeOut",
      duration: 0.6,
    });
  }, [value, highlightOpacity]);

  return isError ? (
    <div className={cx(className, styles.error)} {...props}>
      <svg height="20" width="20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 19a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="var(--red-100)" />
        <path
          clipRule="evenodd"
          d="M10 5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1ZM9 14a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1Z"
          fill="var(--red-500)"
          fillRule="evenodd"
        />
      </svg>
    </div>
  ) : (
    <div
      className={cx(className, styles.value, {
        numerical: isNumericalValue,
      })}
      {...props}
    >
      {isSelected &&
        (type === "empty" ? null : type === "functional" ? (
          <div className={styles.value_type}>f(x)</div>
        ) : type === "alphabetical" ? (
          <div className={styles.value_type}>abc</div>
        ) : expression && onCommit ? (
          <ScrubbableValueType expression={expression} onCommit={onCommit} />
        ) : (
          <div className={styles.value_type}>123</div>
        ))}
      {value && (
        <motion.span
          className={styles.value_content}
          style={
            { "--display-highlight-opacity": highlightOpacity } as CSSProperties
          }
        >
          {value}
        </motion.span>
      )}
    </div>
  );
}

export function Cell({
  cellId,
  value,
  expression,
  width,
  height,
  isSelected,
  isEditing,
  other,
  onSelect,
  onStartEditing,
  onEndEditing,
  onCommit,
  onDelete,
  className,
  style,
  ...props
}: Props) {
  const self = useSelf();

  const handleClick = useCallback(() => {
    if (isSelected) {
      onStartEditing();
    } else {
      onSelect();
    }
  }, [onSelect, onStartEditing, isSelected]);

  return (
    <td
      aria-selected={isSelected}
      className={cx(className, styles.cell, {
        selected: isSelected,
        "selected-other": other,
        editing: isEditing,
      })}
      onClick={handleClick}
      style={
        {
          ...style,
          "--cell-selection":
            isSelected && self ? self.info.color : other?.color,
          "--cell-width": appendUnit(width),
          "--cell-height": appendUnit(height),
        } as CSSProperties
      }
      {...props}
    >
      {other && (
        <div aria-hidden className={styles.user}>
          <img alt={other.url} className={styles.user_avatar} src={other.url} />
          <span className={styles.user_label}>{other.name}</span>
        </div>
      )}
      <div className={styles.content}>
        {isEditing ? (
          <EditingCell
            cellId={cellId}
            expression={expression}
            onCommit={onCommit}
            onEndEditing={onEndEditing}
          />
        ) : (
          <DisplayCell
            value={value}
            expression={expression}
            isSelected={isSelected}
            onCommit={onCommit}
          />
        )}
      </div>
    </td>
  );
}
