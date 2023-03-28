import type { Action, Diagnostic } from "@codemirror/lint";
import { linter as lint } from "@codemirror/lint";
import { getDiagnostics } from "@liveblocks/schema";

export const linter = lint(
  (view) => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = getDiagnostics(code).map((diagnostic) => {
      return {
        from: diagnostic.range[0].offset,
        to: diagnostic.range[1].offset,
        message: diagnostic.message,
        severity: diagnostic.severity,
        actions: diagnostic.suggestions
          ?.map((suggestion): Action | undefined => {
            if (suggestion.type === "replace") {
              return {
                name: "Replace",
                apply: (view, from, to) => {
                  view.dispatch({
                    changes: { from, to, insert: suggestion.name },
                  });
                },
              };
            } else if (suggestion.type === "add-object-type-def") {
              return {
                name: "Add definition",
                apply: (view) => {
                  const insert = `\n\ntype ${suggestion.name} {\n  \n}\n`;
                  const to = code.length;
                  // Ignore trailing new lines and whitespace
                  const from = code.trimEnd().length;

                  view.dispatch({
                    changes: {
                      from: to,
                      insert,
                    },
                    selection: { anchor: from + insert.length - 3 },
                  });
                },
              };
            } else if (suggestion.type === "remove") {
              return {
                name: "Remove",
                apply: (view) => {
                  view.dispatch({
                    changes: {
                      from: suggestion.range[0],
                      to: suggestion.range[1],
                    },
                  });
                },
              };
            } else {
              // Unknown/future suggestion type, ignore for now
              return;
            }
          })
          .filter(Boolean) as Action[],
      };
    });

    return diagnostics;
  },
  { delay: 200 }
);
