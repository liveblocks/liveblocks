import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  PointerEvent,
} from "react";
import React, { useCallback, useMemo } from "react";

import { CrossIcon } from "../../icons/Cross";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";
import { Tooltip } from "./Tooltip";

interface FileAttachmentProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  type: string;
  size: number;
  onContentClick?: MouseEventHandler<HTMLButtonElement>;
  onDeleteClick?: MouseEventHandler<HTMLButtonElement>;
  preventFocusOnDelete?: boolean;
  locale?: string;
}

export function FileAttachment({
  name,
  type,
  size,
  onContentClick,
  onDeleteClick,
  preventFocusOnDelete,
  locale,
  className,
  ...props
}: FileAttachmentProps) {
  const formattedFileSize = useMemo(() => {
    return formatFileSize(size, locale);
  }, [size, locale]);

  console.log(type);

  const handleDeletePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (preventFocusOnDelete) {
        event.preventDefault();
      }
    },
    [preventFocusOnDelete]
  );

  return (
    <div
      className={classNames("lb-attachment lb-file-attachment", className)}
      {...props}
    >
      <button
        className="lb-attachment-content"
        onClick={onContentClick}
        tabIndex={onContentClick ? undefined : -1}
        title={name}
      >
        <div className="lb-attachment-preview">
          <svg
            className="lb-attachment-icon"
            width={40}
            height={40}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V17.157c0-.181-.012-.361-.037-.54A2 2 0 0 0 28 15h-4a2 2 0 0 1-2-2V9a2 2 0 0 0-1.618-1.964A4 4 0 0 0 19.843 7H12Z"
              fill="currentColor"
              fillOpacity={0.2}
              className="lb-attachment-icon-background"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M20.382 7.036a4 4 0 0 1 2.29 1.136l6.156 6.156a4 4 0 0 1 1.136 2.29A2 2 0 0 0 28 15h-4a2 2 0 0 1-2-2V9a2 2 0 0 0-1.618-1.964Z"
              fill="currentColor"
              fillOpacity={0.4}
              className="lb-attachment-icon-fold"
            />

            <path
              d="m18 21 5 3-5 3v-6Z"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.6}
              className="lb-attachment-icon-glyph"
            />
          </svg>
        </div>
        <div className="lb-attachment-details">
          <span className="lb-attachment-name">{name}</span>
          <span className="lb-attachment-size">{formattedFileSize}</span>
        </div>
      </button>
      {onDeleteClick && (
        // TODO: Use $.DELETE_ATTACHMENT
        <Tooltip content="Delete attachment">
          <button
            className="lb-attachment-delete"
            onClick={onDeleteClick}
            onPointerDown={handleDeletePointerDown}
            // TODO: Use $.DELETE_ATTACHMENT
            aria-label="Delete attachment"
          >
            <CrossIcon />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
