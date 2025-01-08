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
import { createInboxNotificationId } from "@liveblocks/core";
import { useRoom, useUser } from "@liveblocks/react";
import {
  useLayoutEffect,
  useMentionSuggestions,
} from "@liveblocks/react/_private";
import { useOverrides } from "@liveblocks/react-ui";
import type { HTMLAttributes, MouseEvent } from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { Avatar } from "./Avatar";

export interface UserProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  userId: string;
}

export const User = forwardRef<HTMLSpanElement, UserProps>(
  function User(props, forwardedRef) {
    const { userId, className, ...spanProps } = props;

    const { user, isLoading } = useUser(userId);
    const $ = useOverrides();

    const name =
      user === undefined || user === null ? $.USER_UNKNOWN : user.name;

    return (
      <span
        className={className}
        data-loading={isLoading ? "" : undefined}
        ref={forwardedRef}
        {...spanProps}
      >
        {isLoading ? null : name}
      </span>
    );
  }
);

export const SUGGESTIONS_COLLISION_PADDING = 10;

export interface MentionsListProps extends HTMLAttributes<HTMLDivElement> {
  query: string;
  command: (otps: { id: string; notificationId: string }) => void;
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
    const suggestions = useMentionSuggestions(room.id, props.query);
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
      const item = (suggestions ?? [])[index];
      if (item) {
        props.command({
          id: item,
          notificationId: createInboxNotificationId(),
        });
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
          {suggestions.map((item, index) => (
            <div
              className="lb-tiptap-suggestions-list-item lb-tiptap-mention-suggestion"
              key={index}
              role="option"
              data-highlighted={index === selectedIndex || undefined}
              onMouseEnter={handleMouseEnter(index)}
              onClick={handleClick(index)}
            >
              <Avatar
                userId={item}
                className="lb-tiptap-mention-suggestion-avatar"
              />
              <User
                userId={item}
                className="lb-tiptap-mention-suggestion-user"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);
