import type { ComponentPropsWithoutRef } from "react";
import React, { useMemo } from "react";

import { CrossIcon } from "../../icons/Cross";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";

interface FileAttachmentProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  type: string;
  size: number;
  onContentClick?: () => void;
  onDeleteClick?: () => void;
  locale?: string;
}

export function FileAttachment({
  name,
  type,
  size,
  onContentClick,
  onDeleteClick,
  locale,
  className,
  ...props
}: FileAttachmentProps) {
  const formattedFileSize = useMemo(() => {
    return formatFileSize(size, locale);
  }, [size, locale]);

  console.log(type);

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
        <button className="lb-attachment-delete" onClick={onDeleteClick}>
          <CrossIcon />
        </button>
      )}
    </div>
  );
}
