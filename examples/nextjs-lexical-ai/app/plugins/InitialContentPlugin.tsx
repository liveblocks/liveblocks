import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";

export function InitialContentPlugin() {
  // const [editor] = useLexicalComposerContext();
  // const searchParams = useSearchParams();
  // const initialContent = searchParams.get("initial");
  //
  // const [alreadyRun, setAlreadyRun] = useState(false);
  //
  // useEffect(() => {
  //   if (alreadyRun) {
  //     return;
  //   }
  //
  //   editor.update(() => {
  //     $convertFromMarkdownString(initialContent || "", TRANSFORMERS);
  //     searchParams.set("initial")
  //     setAlreadyRun(true);
  //   });
  // }, [initialContent]);

  return null;
}
