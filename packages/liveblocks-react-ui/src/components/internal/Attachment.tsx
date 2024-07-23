import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  PointerEvent,
} from "react";
import React, { useCallback, useMemo } from "react";

import { CrossIcon } from "../../icons/Cross";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";

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
      title={name}
      {...props}
    >
      <button
        className="lb-attachment-content"
        onClick={onContentClick}
        tabIndex={onContentClick ? undefined : -1}
      >
        <div className="lb-attachment-icon">
          <svg
            width={40}
            height={40}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30 15v16a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h10m8 8-8-8m8 8h-8V7"
              stroke="currentColor"
              strokeLinejoin="round"
            />

            <text
              x="50%"
              y={25}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="currentColor"
              xmlSpace="preserve"
              // fontSize={8} // 1 or 2 characters
              fontSize={6} // 3 characters
              fontWeight="500"
            >
              PNG
            </text>
          </svg>
        </div>
        <div className="lb-attachment-details">
          <span className="lb-attachment-name">{name}</span>
          <span className="lb-attachment-size">{formattedFileSize}</span>
        </div>
      </button>
      {onDeleteClick && (
        <button
          className="lb-attachment-delete"
          onClick={onDeleteClick}
          onPointerDown={handleDeletePointerDown}
        >
          <CrossIcon />
        </button>
      )}
    </div>
  );
}
