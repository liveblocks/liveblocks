import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon, CopyIcon } from "../../icons";
import { Button } from "./Button";
import { Tooltip, TooltipProvider } from "./Tooltip";

const COPY_DELAY = 1500;

interface CodeBlockProps extends Omit<ComponentProps<"div">, "title"> {
  title: string;
  code: string;
}

export function CodeBlock({ title, code }: CodeBlockProps) {
  const [isCopied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCopied) {
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, COPY_DELAY);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isCopied]);

  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (error) {
      console.error(error);
    }
  }, [code]);

  return (
    <TooltipProvider>
      <div className="lb-code-block">
        <div className="lb-code-block-header">
          <span className="lb-code-block-title">{title}</span>
          <div className="lb-code-block-header-actions">
            <Tooltip content={isCopied ? null : "Copy"}>
              <Button
                className="lb-code-block-header-action"
                icon={isCopied ? <CheckIcon /> : <CopyIcon />}
                onClick={handleCopy}
              />
            </Tooltip>
          </div>
        </div>
        <pre className="lb-code-block-content">
          <code>{code}</code>
        </pre>
      </div>
    </TooltipProvider>
  );
}
