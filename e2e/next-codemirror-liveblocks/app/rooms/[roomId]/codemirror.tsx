import {
  useRef,
  useEffect,
  useImperativeHandle,
  HTMLAttributes,
  Ref,
} from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";

export type CodemirrorElement = {
  getView: () => EditorView | null;
};

export function CodeMirror({
  ref,
  defaultValue,
  defaultExtensions,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "ref"> & {
  ref?: Ref<CodemirrorElement>;
  defaultValue?: string;
  defaultExtensions?: Extension[];
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);

  useImperativeHandle(ref, () => {
    return {
      getView() {
        return view.current;
      },
    };
  }, [view]);

  useEffect(() => {
    if (!container.current) return;

    const _view = new EditorView({
      state: EditorState.create({
        doc: defaultValue,
        extensions: defaultExtensions,
      }),
      parent: container.current,
    });

    view.current = _view;

    return () => {
      _view.destroy();
      view.current = null;
    };
  }, [defaultValue, defaultExtensions]);

  return <div ref={container} {...props} />;
}
