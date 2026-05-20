import type * as monacoNs from "monaco-editor";

// Reuse Monaco's bundled JavaScript / TypeScript Monarch tokenizers to power
// the `jsx` and `tsx` languages we register below. They don't fully grok
// JSX syntax but they at least give you keyword / string / number / comment
// coloring inside ```jsx``` and ```tsx``` code fences.
import {
  conf as jsConf,
  language as jsLanguage,
  // @ts-expect-error - monaco-editor ships these but doesn't declare types
} from "monaco-editor/esm/vs/basic-languages/javascript/javascript";
import {
  conf as tsConf,
  language as tsLanguage,
  // @ts-expect-error - monaco-editor ships these but doesn't declare types
} from "monaco-editor/esm/vs/basic-languages/typescript/typescript";

/**
 * Registers an `mdx` language with Monaco that highlights:
 *
 *   - All the usual markdown constructs (headings, bold/italic, lists,
 *     links, images, block quotes, inline code).
 *   - Fenced code blocks whose language identifier matches a language
 *     already registered with Monaco — the fence delegates tokenization
 *     to that language via Monarch's `nextEmbedded`, so JavaScript inside
 *     ```js ``` is highlighted as JavaScript, etc.
 *   - MDX-specific extras:
 *       - `import` / `export` lines at the top of the file
 *       - JSX-style tags: `<Component>...</Component>`, `<Component />`
 *       - Curly-brace JS expressions: `{1 + 2}`
 *
 * Idempotent: calling more than once is a no-op.
 */
export function registerMdx(monaco: typeof monacoNs): void {
  registerJsx(monaco);
  registerTsx(monaco);

  if (monaco.languages.getLanguages().some((l) => l.id === "mdx")) return;

  monaco.languages.register({
    id: "mdx",
    extensions: [".mdx"],
    aliases: ["MDX", "mdx"],
  });

  monaco.languages.setLanguageConfiguration("mdx", {
    comments: {
      blockComment: ["{/*", "*/}"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string"] },
      { open: "`", close: "`", notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
    ],
  });

  monaco.languages.setMonarchTokensProvider("mdx", mdxLanguage);
}

function registerJsx(monaco: typeof monacoNs): void {
  if (monaco.languages.getLanguages().some((l) => l.id === "jsx")) return;
  monaco.languages.register({
    id: "jsx",
    extensions: [".jsx"],
    aliases: ["JSX", "jsx"],
  });
  monaco.languages.setLanguageConfiguration("jsx", jsConf);
  monaco.languages.setMonarchTokensProvider("jsx", jsLanguage);
}

function registerTsx(monaco: typeof monacoNs): void {
  if (monaco.languages.getLanguages().some((l) => l.id === "tsx")) return;
  monaco.languages.register({
    id: "tsx",
    extensions: [".tsx"],
    aliases: ["TSX", "tsx"],
  });
  monaco.languages.setLanguageConfiguration("tsx", tsConf);
  monaco.languages.setMonarchTokensProvider("tsx", tsLanguage);
}

const mdxLanguage: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".mdx",

  // Used by the `@jsKeywords` reference below.
  jsKeywords: [
    "import",
    "export",
    "from",
    "as",
    "default",
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "true",
    "false",
    "null",
    "undefined",
    "new",
    "typeof",
    "instanceof",
    "in",
    "of",
    "this",
    "class",
    "extends",
    "async",
    "await",
    "yield",
  ],

  tokenizer: {
    root: [
      // ESM imports/exports at line start ----------------------------------
      [/^(\s*)(import|export)\b/, ["", { token: "keyword", next: "@jsLine" }]],

      // Fenced code blocks --------------------------------------------------
      // ```lang  -> delegate tokenization to `lang`, then back when we close.
      [
        /^(\s*)(```)([\w+#-]+)(\s*)$/,
        [
          "",
          { token: "string" },
          { token: "type.identifier" },
          { token: "string", next: "@codeFence", nextEmbedded: "$3" },
        ],
      ],
      // ``` with no language: just style the contents as plain code.
      [
        /^(\s*)(```|~~~)\s*$/,
        ["", { token: "string", next: "@codeFenceUnknown" }],
      ],

      // Headings ------------------------------------------------------------
      [/^(\s*)(#{1,6})(\s.*)$/, ["", "keyword", "keyword"]],

      // Horizontal rule -----------------------------------------------------
      [/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/, ["", "meta.separator"]],

      // Block quote ---------------------------------------------------------
      [/^(\s*)(>)(.*)$/, ["", "comment", "comment"]],

      // Lists ---------------------------------------------------------------
      [/^(\s*)([-*+])(\s.+)$/, ["", "keyword", ""]],
      [/^(\s*)(\d+\.)(\s.+)$/, ["", "keyword", ""]],

      // Bold + italic -------------------------------------------------------
      [/(\*\*\*|___)((?:(?!\1).)+)(\*\*\*|___)/, ["strong", "strong", "strong"]],
      [/(\*\*|__)((?:(?!\1).)+)(\*\*|__)/, ["strong", "strong", "strong"]],
      [/(\*|_)((?:(?!\1)[^*_])+)(\*|_)/, ["emphasis", "emphasis", "emphasis"]],

      // Inline code ---------------------------------------------------------
      [/(`+)((?:[^`]|(?!\1)`)+)(\1)/, ["string", "variable", "string"]],

      // Images + links ------------------------------------------------------
      [/(!\[)([^\]]*)(\])(\()([^)]*)(\))/, ["string.link", "string.link", "string.link", "delimiter", "string.link", "delimiter"]],
      [/(\[)([^\]]+)(\])(\()([^)]+)(\))/, ["string.link", "string.link", "string.link", "delimiter", "string.link", "delimiter"]],

      // MDX curly-brace expressions ----------------------------------------
      [/\{/, { token: "delimiter.curly", next: "@jsExpr" }],

      // JSX closing tag -----------------------------------------------------
      [/<\/([A-Za-z][\w.-]*)\s*>/, "tag"],

      // JSX opening tag -----------------------------------------------------
      [/<([A-Za-z][\w.-]*)/, { token: "tag", next: "@jsxTag" }],

      // Fallback ------------------------------------------------------------
      [/[ \t\r\n]+/, ""],
      [/./, ""],
    ],

    // Continuation of an `import`/`export` line, until end of line.
    jsLine: [
      [/$/, { token: "", next: "@pop" }],
      { include: "@jsCommon" },
    ],

    // Curly-brace JS expression (can nest).
    jsExpr: [
      [/\}/, { token: "delimiter.curly", next: "@pop" }],
      [/\{/, { token: "delimiter.curly", next: "@jsExpr" }],
      { include: "@jsCommon" },
    ],

    // Inside a JSX opening tag: attributes until `>` or `/>`.
    jsxTag: [
      [/\/?>/, { token: "tag", next: "@pop" }],
      [/[A-Za-z_][\w-]*(?=\s*=)/, "attribute.name"],
      [/[A-Za-z_][\w-]*/, "attribute.name"],
      [/=/, "delimiter"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\{/, { token: "delimiter.curly", next: "@jsExpr" }],
      [/\s+/, ""],
    ],

    // Shared between jsLine and jsExpr.
    jsCommon: [
      [
        /\b(import|export|from|as|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|true|false|null|undefined|new|typeof|instanceof|in|of|this|class|extends|async|await|yield)\b/,
        "keyword",
      ],
      [/\b\d+(\.\d+)?\b/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/`/, { token: "string", next: "@templateString" }],
      [/\/\/.*$/, "comment"],
      [/\/\*/, { token: "comment", next: "@blockComment" }],
      [/[A-Z][\w$]*/, "type"],
      [/[a-zA-Z_$][\w$]*/, "identifier"],
      [/=>|[+\-*/%=<>!&|^?:~]+/, "operator"],
      [/[()[\];,.]/, "delimiter"],
      [/\s+/, ""],
    ],

    templateString: [
      [/`/, { token: "string", next: "@pop" }],
      [/\$\{/, { token: "delimiter.curly", next: "@jsExpr" }],
      [/[^`$]+/, "string"],
      [/./, "string"],
    ],

    blockComment: [
      [/\*\//, { token: "comment", next: "@pop" }],
      [/./, "comment"],
    ],

    // Inside a fenced code block whose language is being tokenized by an
    // embedded language (set via `nextEmbedded`). The body has to be empty
    // so Monaco hands every line to the embedded tokenizer. We detect the
    // closing fence on its own line and pop both states.
    codeFence: [
      [
        /^\s*(```|~~~)\s*$/,
        { token: "string", next: "@pop", nextEmbedded: "@pop" },
      ],
    ],

    codeFenceUnknown: [
      [/^\s*(```|~~~)\s*$/, { token: "string", next: "@pop" }],
      [/.*$/, "string"],
    ],
  },
};
