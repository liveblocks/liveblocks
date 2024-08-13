import type { CommentAttachment } from "@liveblocks/core";
import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  PointerEvent,
} from "react";
import React, { memo, useCallback, useMemo } from "react";

import { CrossIcon } from "../../icons/Cross";
import { SpinnerIcon } from "../../icons/Spinner";
import { WarningIcon } from "../../icons/Warning";
import type { GlobalOverrides } from "../../overrides";
import { useOverrides } from "../../overrides";
import type { ComposerAttachment } from "../../primitives";
import { useComposerAttachmentsContextOrNull } from "../../primitives/Composer/contexts";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";
import { Tooltip } from "./Tooltip";

interface FileAttachmentProps extends ComponentPropsWithoutRef<"div"> {
  attachment: CommentAttachment | ComposerAttachment;
  onContentClick?: MouseEventHandler<HTMLButtonElement>;
  onDeleteClick?: MouseEventHandler<HTMLButtonElement>;
  preventFocusOnDelete?: boolean;
  overrides?: Partial<GlobalOverrides>;
}

const fileExtensionRegex = /^(.+?)(\.[^.]+)?$/;

function splitFileName(name: string) {
  const match = name.match(fileExtensionRegex);

  return { base: match?.[1] ?? name, extension: match?.[2] };
}

function getFileAttcachmentIconGlyph(mimeType: string) {
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip"
  ) {
    return (
      <path d="M13 15h2v1h-1.5a.5.5 0 0 0 0 1H15v1h-1.5a.5.5 0 0 0 0 1H15v1h-1.5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 .5-.5V20h1.5a.5.5 0 0 0 0-1H15v-1h1.5a.5.5 0 0 0 0-1H15v-1h1.5a.5.5 0 0 0 .5-.5V15a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
    );
  }

  if (mimeType.startsWith("text/")) {
    return (
      <path d="M10 16a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8a.5.5 0 0 1-.5-.5Z" />
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <path d="M12 16h6a1 1 0 0 1 1 1v3l-1.293-1.293a1 1 0 0 0-1.414 0L14.09 20.91l-.464-.386a1 1 0 0 0-1.265-.013l-1.231.985A.995.995 0 0 1 11 21v-4a1 1 0 0 1 1-1Zm-2 1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-4Zm3 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    );
  }

  if (mimeType.startsWith("video/")) {
    return (
      <path d="M12 15.71a1 1 0 0 1 1.49-.872l4.96 2.79a1 1 0 0 1 0 1.744l-4.96 2.79A1 1 0 0 1 12 21.29v-5.58Z" />
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <path d="M15 15a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 1 0v-7a.5.5 0 0 0-.5-.5Zm-2.5 2.5a.5.5 0 0 1 1 0v3a.5.5 0 0 1-1 0v-3Zm-2 1a.5.5 0 0 1 1 0v1a.5.5 0 0 1-1 0v-1Zm6-1a.5.5 0 0 1 1 0v3a.5.5 0 0 1-1 0v-3ZM19 16a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Z" />
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
      width={30}
      height={30}
      viewBox="0 0 30 30"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 5a2 2 0 0 1 2-2h5.843a4 4 0 0 1 2.829 1.172l6.156 6.156A4 4 0 0 1 24 13.157V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5Z"
        className="lb-attachment-icon-shadow"
      />
      <path
        d="M6 5a2 2 0 0 1 2-2h5.843a4 4 0 0 1 2.829 1.172l6.156 6.156A4 4 0 0 1 24 13.157V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5Z"
        className="lb-attachment-icon-background"
      />
      <path
        d="M14.382 3.037a4 4 0 0 1 2.29 1.135l6.156 6.157a4 4 0 0 1 1.136 2.289A2 2 0 0 0 22 11h-4a2 2 0 0 1-2-2V5a2 2 0 0 0-1.618-1.963Z"
        className="lb-attachment-icon-fold"
      />

      {iconGlyph && <g className="lb-attachment-icon-glyph">{iconGlyph}</g>}
    </svg>
  );
});

export function FileAttachment({
  attachment,
  overrides,
  onContentClick,
  onDeleteClick,
  preventFocusOnDelete,
  className,
  ...props
}: FileAttachmentProps) {
  const $ = useOverrides(overrides);
  const composerAttachmentsContext = useComposerAttachmentsContextOrNull();
  const { base: fileBaseName, extension: fileExtension } = useMemo(() => {
    return splitFileName(attachment.name);
  }, [attachment.name]);
  const status = (attachment as ComposerAttachment).status;
  const isError = status === "error" || status === "too-large";
  const isUploading = status === "uploading";
  const description = useMemo(() => {
    if (composerAttachmentsContext && "status" in attachment) {
      switch (attachment.status) {
        case "too-large":
          return $.ATTACHMENT_TOO_LARGE(
            formatFileSize(
              composerAttachmentsContext.maxAttachmentSize,
              $.locale
            )
          );
        case "error":
          return $.ATTACHMENT_ERROR(attachment.error);
        default:
          return formatFileSize(attachment.size, $.locale);
      }
    } else {
      return formatFileSize(attachment.size, $.locale);
    }
  }, [composerAttachmentsContext, attachment, $]);

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
      data-error={isError ? "" : undefined}
      data-uploading={isUploading ? "" : undefined}
      {...props}
    >
      <button
        type="button"
        className="lb-attachment-content"
        onClick={onContentClick}
        tabIndex={onContentClick ? undefined : -1}
      >
        <div className="lb-attachment-preview">
          {isUploading ? (
            <SpinnerIcon />
          ) : isError ? (
            <WarningIcon />
          ) : (
            <FileAttachmentIcon mimeType={attachment.mimeType} />
          )}
        </div>
        <div className="lb-attachment-details">
          <span className="lb-attachment-name" title={attachment.name}>
            <span className="lb-attachment-name-base">{fileBaseName}</span>
            {fileExtension && (
              <span className="lb-attachment-name-extension">
                {fileExtension}
              </span>
            )}
          </span>
          <span className="lb-attachment-description" title={description}>
            {description}
          </span>
        </div>
      </button>
      {onDeleteClick && (
        <Tooltip content={$.ATTACHMENT_DELETE}>
          <button
            type="button"
            className="lb-attachment-delete"
            onClick={onDeleteClick}
            onPointerDown={handleDeletePointerDown}
            aria-label={$.ATTACHMENT_DELETE}
          >
            <CrossIcon />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
