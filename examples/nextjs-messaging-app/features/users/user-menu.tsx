"use client";

import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { LogOutIcon, SmilePlusIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { getUser } from "@/lib/database";
import { hasStatus, isActive, STATUS_TEXT_MAX_LENGTH } from "@/lib/status";
import { EmojiPickerPopover } from "@/primitives/emoji-picker-popover";
import { StatusEmoji } from "@/primitives/status-emoji";
import { useUserStatus } from "./use-user-status";

export function UserMenu({
  userId,
  onSignOut,
}: {
  userId: string;
  onSignOut?: (() => void) | null;
}) {
  const [open, setOpen] = useState(false);
  const user = getUser(userId);
  const { status, setStatus, clearStatus, setAway } = useUserStatus();
  const active = isActive(status);

  if (!user) {
    return null;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex flex-col items-center"
          aria-label={`Signed in as ${user.info.name}. Open menu`}
        >
          {status.emoji ? (
            <span className="flex h-11 w-9 items-start justify-center rounded-lg bg-sidebar-active pt-1.5">
              <StatusEmoji status={status} size="lg" />
            </span>
          ) : null}
          <span
            className={clsx(
              "relative block size-9 rounded-lg",
              status.emoji && "-mt-3"
            )}
            title={user.info.name}
          >
            <img
              src={user.info.avatar}
              alt=""
              className="size-full rounded-lg object-cover"
            />
            <PresenceDot active={active} className="-bottom-0.5 -right-0.5" />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          onFocusOutside={(event) => event.preventDefault()}
          className="z-30 w-72 overflow-hidden rounded-lg border border-black/10 bg-white text-neutral-900 shadow-xl"
          aria-label="Account menu"
        >
          <div className="flex items-center gap-3 px-3 pt-3">
            <span className="relative inline-block size-9 shrink-0 rounded-md bg-neutral-200">
              <img
                src={user.info.avatar}
                alt=""
                className="size-full rounded-md object-cover"
              />
              <PresenceDot
                active={active}
                className="-bottom-0.5 -right-0.5"
                ringClassName="border-white"
              />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {user.info.name}
              </div>
              <div className="text-xs text-neutral-500">
                {active ? "Active" : "Away"}
              </div>
            </div>
          </div>

          <StatusEditor
            emoji={status.emoji}
            text={status.text}
            canClear={hasStatus(status)}
            onEmojiChange={(emoji) => setStatus({ emoji })}
            onTextChange={(text) => setStatus({ text })}
            onTextSubmit={(text) => {
              setStatus({ text });
              setOpen(false);
            }}
            onClear={clearStatus}
          />

          <div className="border-t border-black/10 py-1">
            <MenuItem onClick={() => setAway(active)}>
              {active ? "Set yourself as away" : "Set yourself as online"}
            </MenuItem>
          </div>

          {onSignOut ? (
            <div className="border-t border-black/10 py-1">
              <MenuItem
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                <LogOutIcon className="size-4 shrink-0" aria-hidden />
                Sign out
              </MenuItem>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function StatusEditor({
  emoji,
  text,
  canClear,
  onEmojiChange,
  onTextChange,
  onTextSubmit,
  onClear,
}: {
  emoji: string | null;
  text: string;
  canClear: boolean;
  onEmojiChange: (emoji: string) => void;
  onTextChange: (text: string) => void;
  onTextSubmit: (text: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(text);
  const [committedText, setCommittedText] = useState(text);

  if (text !== committedText) {
    setCommittedText(text);
    setDraft(text);
  }

  const commit = () => {
    if (draft.trim() !== text) {
      onTextChange(draft);
    }
  };

  return (
    <form
      className="px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onTextSubmit(draft);
      }}
    >
      <label
        htmlFor="user-status-text"
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Status
      </label>
      <div className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white pr-1 transition-all focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100/80">
        <EmojiPickerPopover onSelect={onEmojiChange}>
          <button
            type="button"
            aria-label={
              emoji ? `Status emoji ${emoji}. Change` : "Add an emoji"
            }
            className="flex size-8 shrink-0 items-center justify-center rounded-l-md text-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            {emoji ?? <SmilePlusIcon className="size-4" aria-hidden />}
          </button>
        </EmojiPickerPopover>
        <input
          id="user-status-text"
          type="text"
          value={draft}
          maxLength={STATUS_TEXT_MAX_LENGTH}
          placeholder="What's your status?"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-neutral-400"
        />
        {canClear ? (
          <button
            type="button"
            aria-label="Clear status"
            onClick={() => {
              setDraft("");
              onClear();
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </form>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-800 transition hover:bg-neutral-100"
    >
      {children}
    </button>
  );
}

function PresenceDot({
  active,
  className,
  ringClassName = "border-sidebar",
}: {
  active: boolean;
  className?: string;
  ringClassName?: string;
}) {
  return (
    <span
      className={clsx(
        "absolute size-3 rounded-full border-2",
        ringClassName,
        active
          ? "bg-green-500"
          : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-neutral-400)]",
        className
      )}
      aria-label={active ? "Online" : "Away"}
    />
  );
}
