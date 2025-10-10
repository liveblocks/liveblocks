"use client";

import { type ComponentProps, useMemo } from "react";

import { cn } from "../../utils/cn";

export interface FaviconProps extends ComponentProps<"div"> {
  url: string;
}

// TODO: Use `useUrlMetadata`
export function Favicon({ url, className, ...props }: FaviconProps) {
  // const { metadata } = useUrlMetadata(url);
  const faviconUrl = useMemo(() => {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}`;
  }, [url]);

  return (
    <div className={cn("lb-favicon", className)} {...props}>
      <img
        // src={metadata?.icon}
        // alt={metadata?.title}
        src={faviconUrl}
      />
    </div>
  );
}
