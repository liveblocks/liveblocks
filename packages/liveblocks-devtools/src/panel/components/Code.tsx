import cx from "classnames";
import type { Language, PrismTheme } from "prism-react-renderer";
import Highlight, { defaultProps } from "prism-react-renderer";
import type { ComponentProps } from "react";

export interface Props extends ComponentProps<"pre"> {
  code: string;
  language?: Language;
}

const theme: PrismTheme = {
  plain: {
    color: "var(--color-code)",
    background: "transparent",
  },
  styles: [
    {
      types: ["comment"],
      style: {
        color: "var(--color-code-comment)",
        fontStyle: "italic",
      },
    },
    {
      types: ["variable"],
      style: {
        color: "var(--color-code-variable)",
      },
    },
    {
      types: ["number", "boolean"],
      style: {
        color: "var(--color-code-value)",
      },
    },
    {
      types: ["punctuation"],
      style: {
        color: "var(--color-code-punctuation)",
      },
    },
    {
      types: ["selector", "doctype"],
      style: {
        color: "var(--color-code-punctuation)",
        fontStyle: "italic",
      },
    },
    {
      types: ["tag", "keyword", "property", "operator", "namespace"],
      style: {
        color: "var(--color-code-tag)",
      },
    },
    {
      types: ["class-name", "maybe-class-name"],
      style: {
        color: "var(--color-code-class)",
      },
    },
    {
      types: ["constant", "builtin", "char", "function", "attr-name"],
      style: {
        color: "var(--color-code-constant)",
      },
    },
    {
      types: ["string", "url"],
      style: {
        color: "var(--color-code-string)",
      },
    },
  ],
};

export function Code({
  code,
  language = "text" as Language,
  className,
  style,
  ...props
}: Props) {
  return (
    <Highlight {...defaultProps} code={code} language={language} theme={theme}>
      {({
        className: prismClassName,
        style: prismStyle,
        tokens,
        getLineProps,
        getTokenProps,
      }) => (
        <pre
          className={cx(
            className,
            prismClassName,
            "child:select-auto select-auto overflow-y-auto px-2.5 py-2"
          )}
          style={{ ...style, ...prismStyle }}
          {...props}
        >
          {tokens.map((line, index) => (
            <div
              {...getLineProps({ line, key: index, className: "table-row" })}
            >
              <span className="text-light-900 dark:text-dark-600 table-cell select-none pr-2.5 pl-0.5 text-right">
                {index + 1}
              </span>
              <span className="table-cell">
                {line.map((token, key) => (
                  <span {...getTokenProps({ token, key })} />
                ))}
              </span>
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
