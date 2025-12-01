import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { assertNever, createInboxNotificationId } from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import {
  useLayoutEffect,
  useMentionSuggestions,
} from "@liveblocks/react/_private";
import {
  Avatar,
  Group,
  GroupDescription,
  User,
  UsersIcon,
} from "@liveblocks/react-ui/_private";
import type { HTMLAttributes, MouseEvent } from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import type { TiptapMentionData } from "../types";

export const SUGGESTIONS_COLLISION_PADDING = 10;

export interface MentionsListProps extends HTMLAttributes<HTMLDivElement> {
  query: string;
  command: (otps: TiptapMentionData) => void;
  clientRect: () => DOMRect;
  hide: boolean;
}

export type MentionsListHandle = {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
};

export const MentionsList = forwardRef<MentionsListHandle, MentionsListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const room = useRoom();
    const suggestions = useMentionSuggestions(room.id, props.query, {
      excludedKinds: { agent: true },
    });
    const { onMouseEnter, onClick } = props;
    const {
      refs: { setReference, setFloating },
      strategy,
      x,
      y,
    } = useFloating({
      strategy: "fixed",
      placement: "top-start",
      middleware: [
        flip({ padding: SUGGESTIONS_COLLISION_PADDING, crossAxis: false }),
        offset(10),
        hide({ padding: SUGGESTIONS_COLLISION_PADDING }),
        shift({
          padding: SUGGESTIONS_COLLISION_PADDING,
          limiter: limitShift(),
        }),
        size({ padding: SUGGESTIONS_COLLISION_PADDING }),
      ],
      whileElementsMounted: (...args) => {
        return autoUpdate(...args, {
          animationFrame: true,
        });
      },
    });

    useLayoutEffect(() => {
      setReference({
        getBoundingClientRect: props.clientRect,
      });
    }, [setReference, props.clientRect]);

    const selectItem = (index: number) => {
      const mention = (suggestions ?? [])[index];

      if (!mention) {
        return;
      }

      const notificationId = createInboxNotificationId();

      switch (mention.kind) {
        case "user":
          props.command({
            kind: "user",
            id: mention.id,
            notificationId,
          });
          break;

        case "group":
          props.command({
            kind: "group",
            id: mention.id,
            userIds: mention.userIds,
            notificationId,
          });
          break;

        default:
          return assertNever(mention, "Unhandled mention kind");
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + (suggestions?.length ?? 0) - 1) %
          (suggestions?.length ?? 0)
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % (suggestions?.length ?? 0));
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [suggestions]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    const handleClick =
      (index: number) => (event: MouseEvent<HTMLDivElement>) => {
        onClick?.(event);

        if (event.isDefaultPrevented()) return;
        selectItem(index);
      };
    const handleMouseEnter =
      (index: number) => (event: MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(event);

        if (event.isDefaultPrevented()) return;

        setSelectedIndex(index);
      };

    if (suggestions === undefined || suggestions.length === 0) {
      return null;
    }

    return (
      <div
        className="lb-root lb-portal lb-elevation lb-tiptap-suggestions lb-tiptap-mention-suggestions"
        ref={setFloating}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
          minWidth: "max-content",
          display: props.hide ? "none" : "block",
        }}
      >
        <div className="lb-tiptap-suggestions-list lb-tiptap-mention-suggestions-list">
          {suggestions.map((mention, index) => {
            return (
              <div
                className="lb-tiptap-suggestions-list-item lb-tiptap-mention-suggestion"
                key={index}
                role="option"
                data-highlighted={index === selectedIndex || undefined}
                onMouseEnter={handleMouseEnter(index)}
                onClick={handleClick(index)}
              >
                {mention.kind === "user" ? (
                  <>
                    <Avatar
                      userId={mention.id}
                      className="lb-tiptap-mention-suggestion-avatar"
                    />
                    <User
                      userId={mention.id}
                      className="lb-tiptap-mention-suggestion-user"
                    />
                  </>
                ) : mention.kind === "group" ? (
                  <>
                    <Avatar
                      groupId={mention.id}
                      className="lb-tiptap-mention-suggestion-avatar"
                      icon={<UsersIcon />}
                    />
                    <Group
                      groupId={mention.id}
                      className="lb-tiptap-mention-suggestion-group"
                    >
                      <GroupDescription
                        groupId={mention.id}
                        className="lb-tiptap-mention-suggestion-group-description"
                      />
                    </Group>
                  </>
                ) : (
                  assertNever(mention, "Unhandled mention kind")
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
