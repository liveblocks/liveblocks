import {
  delimitedIndent,
  foldInside,
  foldNodeProp,
  indentNodeProp,
  LanguageSupport,
  LRLanguage,
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";

import { parser } from "./syntax.grammar";

const parentheses = "( )";
const braces = "{ }";
const angleBrackets = "< >";
const punctuations = `${parentheses} ${braces} ${angleBrackets} : = ? |`;
const blocks = `FieldsDefinition ${braces}`;
const generic = `GenericType ${angleBrackets}`;

export const LiveblocksSchema = LRLanguage.define({
  name: "liveblocks-schema",
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        [blocks]: delimitedIndent({ closing: "}", align: true }),
      }),
      indentNodeProp.add({
        [generic]: delimitedIndent({ closing: ">", align: false }),
      }),
      foldNodeProp.add({
        [blocks]: foldInside,
      }),
      styleTags({
        Comment: t.lineComment,
        ValueName: t.name,
        NamedType: t.typeName,
        GenericType: t.special(t.typeName),
        NamedTypeDeclaration: t.function(t.typeName),
        type: t.keyword,
        separator: t.separator,
        comma: t.separator,
        [parentheses]: t.paren,
        [braces]: t.brace,
        [angleBrackets]: t.angleBracket,
        [punctuations]: t.punctuation,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["{", "<", "[", "(", '"'] },
    indentOnInput: /^\s*(\{|\})$/,
  },
});

export function liveblocksSchema(): LanguageSupport {
  return new LanguageSupport(LiveblocksSchema);
}

export { linter } from "./linter";
