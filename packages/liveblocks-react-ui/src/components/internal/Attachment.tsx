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
        <div className="lb-attachment-icon" />
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
