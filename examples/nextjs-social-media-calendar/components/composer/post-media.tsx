"use client";

import { LiveList, type LiveFile, type LiveFileData } from "@liveblocks/client";
import {
  useFileUrl,
  useMutation,
  useUploadFile,
} from "@liveblocks/react/suspense";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import {
  Suspense,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Like most networks: up to four photos or videos per post. */
export const MAX_MEDIA = 4;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/*,video/*";

const NO_MEDIA: LiveFileData[] = [];

type PendingUpload = {
  key: string;
  file: File;
  previewUrl: string;
  error?: string;
};

/**
 * The photos and videos attached to a post. Used inside the project room:
 * files are uploaded to it with `useUploadFile` and stored on the post as
 * `LiveFile`s in a `LiveList`, so everyone sees them appear, on the composer
 * and on the calendar card alike; `useFileUrl` gets a URL to show each one.
 */
export function usePostMedia(
  postId: string,
  media: readonly LiveFileData[] = NO_MEDIA
) {
  const uploadFile = useUploadFile();
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const addMedia = useMutation(
    ({ storage }, file: LiveFile) => {
      const post = storage.get("posts").get(postId);
      if (!post) {
        return;
      }
      // Posts created before media existed have no list yet.
      let list = post.get("media");
      if (!list) {
        list = new LiveList<LiveFile>([]);
        post.set("media", list);
      }
      if (list.length < MAX_MEDIA) {
        list.push(file);
      }
    },
    [postId]
  );

  const removeMedia = useMutation(
    ({ storage }, fileId: string) => {
      const list = storage.get("posts").get(postId)?.get("media");
      if (!list) {
        return;
      }
      const index = list.findIndex((file) => file.id === fileId);
      if (index !== -1) {
        list.delete(index);
      }
    },
    [postId]
  );

  const dismissPending = useCallback((key: string) => {
    setPending((current) => {
      const upload = current.find((item) => item.key === key);
      if (upload) {
        URL.revokeObjectURL(upload.previewUrl);
      }
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const upload = useCallback(
    (files: File[]) => {
      const room = MAX_MEDIA - media.length - pending.length;
      for (const file of files.slice(0, Math.max(room, 0))) {
        const key = `${file.name}-${file.lastModified}-${Math.random()}`;
        const previewUrl = URL.createObjectURL(file);
        if (file.size > MAX_FILE_BYTES) {
          setPending((current) => [
            ...current,
            { key, file, previewUrl, error: "Larger than 50 MB" },
          ]);
          continue;
        }
        setPending((current) => [...current, { key, file, previewUrl }]);
        uploadFile(file).then(
          (liveFile) => {
            addMedia(liveFile);
            dismissPending(key);
          },
          () => {
            setPending((current) =>
              current.map((item) =>
                item.key === key ? { ...item, error: "Upload failed" } : item
              )
            );
          }
        );
      }
    },
    [media.length, pending.length, uploadFile, addMedia, dismissPending]
  );

  return {
    media,
    pending,
    canAdd: media.length + pending.length < MAX_MEDIA,
    upload,
    removeMedia,
    dismissPending,
  };
}

type PostMediaProps = ReturnType<typeof usePostMedia>;

/** The attached media, laid out like a network does: one wide, or a grid. */
export function PostMedia({
  media,
  pending,
  removeMedia,
  dismissPending,
}: PostMediaProps) {
  const count = media.length + pending.length;
  if (count === 0) {
    return null;
  }

  return (
    <ul
      className={cn(
        "grid gap-0.5 overflow-hidden rounded-2xl border border-neutral-950/10",
        count > 1 && "grid-cols-2"
      )}
      aria-label="Attached media"
    >
      {media.map((file) => (
        <li
          key={file.id}
          className="group/media relative min-w-0 bg-neutral-100"
        >
          <Suspense fallback={<MediaSkeleton name={file.name} />}>
            <MediaPreview file={file} single={count === 1} />
          </Suspense>
          <RemoveButton
            label={`Remove ${file.name}`}
            onClick={() => removeMedia(file.id)}
          />
        </li>
      ))}
      {pending.map((upload) => (
        <li
          key={upload.key}
          className="group/media relative min-w-0 bg-neutral-100"
        >
          <Media
            src={upload.previewUrl}
            mimeType={upload.file.type}
            name={upload.file.name}
            single={count === 1}
            className={upload.error ? "opacity-40" : "opacity-60"}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {upload.error ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm">
                {upload.error}
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm"
                role="status"
              >
                <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                Uploading…
              </span>
            )}
          </div>
          <RemoveButton
            label={
              upload.error
                ? `Dismiss ${upload.file.name}`
                : `Cancel ${upload.file.name}`
            }
            onClick={() => dismissPending(upload.key)}
            visible
          />
        </li>
      ))}
    </ul>
  );
}

function MediaPreview({
  file,
  single,
}: {
  file: LiveFileData;
  single: boolean;
}) {
  const { url } = useFileUrl(file);
  return (
    <Media
      src={url}
      mimeType={file.mimeType}
      name={file.name}
      single={single}
    />
  );
}

function Media({
  src,
  mimeType,
  name,
  single,
  className,
}: {
  src: string;
  mimeType: string;
  name: string;
  single: boolean;
  className?: string;
}) {
  const shape = single ? "max-h-[420px] w-full" : "aspect-square w-full";
  if (mimeType.startsWith("video/")) {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className={cn("block bg-black object-contain", shape, className)}
        aria-label={name}
      />
    );
  }
  // Presigned URLs from Liveblocks: plain <img>, not next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      className={cn("block object-cover", shape, className)}
    />
  );
}

function MediaSkeleton({ name }: { name: string }) {
  return (
    <div
      className="flex aspect-square w-full animate-pulse items-center justify-center bg-neutral-100 text-xs text-neutral-400"
      aria-label={`Loading ${name}`}
      aria-busy
    />
  );
}

function RemoveButton({
  label,
  onClick,
  visible,
}: {
  label: string;
  onClick: () => void;
  visible?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-2 right-2 rounded-full bg-neutral-900/70 text-white backdrop-blur-sm transition-opacity hover:bg-neutral-900/90 hover:text-white focus-visible:opacity-100",
        visible ? "opacity-100" : "opacity-0 group-hover/media:opacity-100"
      )}
    >
      <XIcon />
    </Button>
  );
}

/** The footer button that picks photos or videos to upload. */
export function AddMediaButton({
  canAdd,
  upload,
}: Pick<PostMediaProps, "canAdd" | "upload">) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > 0) {
      upload(files);
    }
    // Let the same file be picked again later.
    event.currentTarget.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => inputRef.current?.click()}
              disabled={!canAdd}
              aria-label="Add photos or videos"
              className="text-primary hover:text-primary"
            />
          }
        >
          <ImagePlusIcon />
        </TooltipTrigger>
        <TooltipContent>
          {canAdd ? "Add photos or videos" : `Up to ${MAX_MEDIA} per post`}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
