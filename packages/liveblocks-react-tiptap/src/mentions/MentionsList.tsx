import { autoUpdate, flip, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import { useUser } from "@liveblocks/react";
import { useMentionSuggestions, useOverrides } from "@liveblocks/react-ui";
import type { HTMLAttributes } from "react";
import React, {
  forwardRef, useEffect, useImperativeHandle,
  useLayoutEffect,
  useState,
} from "react"


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
        data-loading={isLoading ? "" : undefined}
        {...spanProps}
        ref={forwardedRef}
      >
        {isLoading ? null : name}
      </span>
    );
  }
);


export const SUGGESTIONS_COLLISION_PADDING = 10;

export const MentionsList = forwardRef((props: { query: string, command: (otps: { id: string }) => {}, clientRect: () => DOMRect, hide: boolean }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const suggestions = useMentionSuggestions(props.query);
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
      shift({ padding: SUGGESTIONS_COLLISION_PADDING, limiter: limitShift() }),
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
      props.command({ id: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + (suggestions?.length ?? 0) - 1) % (suggestions?.length ?? 0))
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % (suggestions?.length ?? 0))
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [suggestions])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler()
        return true
      }

      if (event.key === "ArrowDown") {
        downHandler()
        return true
      }

      if (event.key === "Enter") {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (suggestions !== undefined && suggestions.length === 0) {
    return null
  }

  return (
    <div className="dropdown-menu" ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
        display: props.hide ? "none" : "block"
      }}>
      {suggestions === undefined ? <div className="item">Loading...</div> :

        suggestions.map((item, index) => (
          <button
            className={index === selectedIndex ? "is-selected" : ""}
            key={index}
            onClick={() => selectItem(index)}
          >
            <User userId={item} />
          </button>
        ))
      }
    </div>
  )
})