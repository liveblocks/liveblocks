import type { CommentAttachment } from "@liveblocks/core";
import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  PointerEvent,
} from "react";
import React, { memo, useCallback, useMemo } from "react";

import { CrossIcon } from "../../icons/Cross";
import { SpinnerIcon } from "../../icons/Spinner";
import type { ComposerAttachment } from "../../primitives";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";
import { Tooltip } from "./Tooltip";

interface FileAttachmentProps extends ComponentPropsWithoutRef<"div"> {
  attachment: CommentAttachment | ComposerAttachment;
  onContentClick?: MouseEventHandler<HTMLButtonElement>;
  onDeleteClick?: MouseEventHandler<HTMLButtonElement>;
  deleteLabel?: string;
  preventFocusOnDelete?: boolean;
  locale?: string;
}

function getFileAttcachmentIconGlyph(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return (
      <>
        <rect x={16} y={20} width={8} height={8} rx={1} />
        <path d="m24 25-.71-.355a2 2 0 0 0-2.31.374L18 28" />
        <path d="M19 23h.007" />
        <circle cx={19} cy={23} r={0.25} />
      </>
    );
  }

  if (mimeType.startsWith("video/")) {
    return <path d="m17.5 20.5 6 3.5-6 3.5v-7Z" />;
  }

  if (mimeType.startsWith("audio/")) {
    return <path d="M15.5 23v2m3-3v4m3-6v8m3-6v4" />;
  }

  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip"
  ) {
    return (
      <>
        <rect x={16} y={20} width={8} height={8} rx={1} />
        <path d="M19 20v1m0 2h.007M19 25h.007" />
      </>
    );
  }

  return null;
}

const FileAttachmentIcon = memo(({ mimeType }: { mimeType: string }) => {
  const iconGlyph = useMemo(
    () => getFileAttcachmentIconGlyph(mimeType),
    [mimeType]
  );

  return (
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

      {iconGlyph && (
        <g
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lb-attachment-icon-glyph"
        >
          {iconGlyph}
        </g>
      )}
    </svg>
  );
});

export function FileAttachment({
  attachment,
  onContentClick,
  onDeleteClick,
  deleteLabel,
  preventFocusOnDelete,
  locale,
  className,
  ...props
}: FileAttachmentProps) {
  const formattedFileSize = useMemo(() => {
    return formatFileSize(attachment.size, locale);
  }, [attachment.size, locale]);
  const error = "error" in attachment ? attachment.error : undefined;
  const isUploading =
    "status" in attachment && attachment.status === "uploading";

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
      data-error={error ? "" : undefined}
      data-uploading={isUploading ? "" : undefined}
      {...props}
    >
      <button
        className="lb-attachment-content"
        onClick={onContentClick}
        tabIndex={onContentClick ? undefined : -1}
      >
        <div className="lb-attachment-preview">
          {isUploading ? (
            <SpinnerIcon />
          ) : error ? (
            <div>error icon</div>
          ) : (
            <FileAttachmentIcon mimeType={attachment.mimeType} />
          )}
        </div>
        <div className="lb-attachment-details">
          <span className="lb-attachment-name" title={attachment.name}>
            {attachment.name}
          </span>
          <span
            className="lb-attachment-description"
            title={error ? error.message : undefined}
          >
            {error ? error.message : formattedFileSize}
          </span>
        </div>
      </button>
      {onDeleteClick && deleteLabel && (
        <Tooltip content={deleteLabel}>
          <button
            className="lb-attachment-delete"
            onClick={onDeleteClick}
            onPointerDown={handleDeletePointerDown}
            aria-label={deleteLabel}
          >
            <CrossIcon />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
