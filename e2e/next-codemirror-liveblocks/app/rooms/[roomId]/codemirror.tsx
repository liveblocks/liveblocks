import { useRef, type RefObject } from "react";

import { EditorView } from "@codemirror/view";
import { useImperativeHandle, useEffect, type HTMLAttributes } from "react";
import { EditorState } from "@codemirror/state";

export interface EditorHandle {
  view: EditorView;
}

export function CodeMirror({
  ref,
  defaultState,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "ref"> & {
  defaultState?: EditorState;
  ref?: RefObject<EditorHandle | null>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  const _state = useRef<EditorState | null>(null);
  if (_state.current === null) {
    _state.current = EditorState.create(defaultState);
  }
  const state = _state.current;

  useImperativeHandle(ref, () => {
    return new (class implements EditorHandle {
      get view() {
        if (view.current === null) {
          throw new Error("View is not initialized");
        }
        return view.current;
      }
    })();
  }, [view]);

  useEffect(() => {
    if (container.current === null) return;

    const _view = new EditorView({ parent: container.current, state });

    view.current = _view;
    return () => {
      _view.destroy();
      view.current = null;
    };
  }, [state]);

  return <div ref={container} {...props} />;
}
