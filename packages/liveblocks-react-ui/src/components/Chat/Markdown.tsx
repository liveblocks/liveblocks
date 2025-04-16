import { Lexer, type Token } from "marked";
import { Fragment, useMemo } from "react";

export function Markdown({ content }: { content: string }) {
  const tokens = useMemo(() => {
    return new Lexer().lex(content);
  }, [content]);

  return tokens.map((token, index) => (
    <BlockTokenComp token={token} key={index} />
  ));
}

function BlockTokenComp({ token }: { token: Token }) {
  switch (token.type) {
    case "heading": {
      let HeadingTag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      switch (token.depth) {
        case 1:
          HeadingTag = "h1";
          break;
        case 2:
          HeadingTag = "h2";
          break;
        case 3:
          HeadingTag = "h3";
          break;
        case 4:
          HeadingTag = "h4";
          break;
        case 5:
          HeadingTag = "h5";
          break;
        case 6:
          HeadingTag = "h6";
          break;
        default:
          HeadingTag = "h1";
          break;
      }
      return (
        <HeadingTag>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </HeadingTag>
      );
    }
    case "paragraph": {
      return (
        <p>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </p>
      );
    }
    case "text": {
      // TODO: Ask Nimesh about this. I had to add this `"tokens" in ...` check
      // here to work around a TS issue.
      if ("tokens" in token && token.tokens !== undefined) {
        return (
          <Fragment>
            {(token.tokens ?? []).map((token, index) => (
              <InlineTokenComp token={token} key={index} />
            ))}
          </Fragment>
        );
      }
      if (typeof token.text !== "string") return null;
      return token.text;
    }
    case "blockquote": {
      return (
        <blockquote>
          {(token.tokens ?? []).map((token, index) => (
            <BlockTokenComp token={token} key={index} />
          ))}
        </blockquote>
      );
    }
    default:
      return null;
  }
}

function InlineTokenComp({ token }: { token: Token }) {
  switch (token.type) {
    case "text":
    case "escape": {
      if (typeof token.text !== "string") return null;
      return token.text;
    }
    case "strong": {
      return (
        <strong>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </strong>
      );
    }
    case "em": {
      return (
        <em>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </em>
      );
    }
    case "del": {
      return (
        <del>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </del>
      );
    }
    case "link": {
      if (typeof token.href !== "string") return null;
      return (
        <a href={token.href}>
          {(token.tokens ?? []).map((token, index) => (
            <InlineTokenComp token={token} key={index} />
          ))}
        </a>
      );
    }
    case "codespan": {
      return <code>{token.text}</code>;
    }
    case "br": {
      return <br />;
    }
    default:
      return null;
  }
}
