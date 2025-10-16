"use client";

import { useUrlMetadata } from "@liveblocks/react";
import { type ComponentProps } from "react";

import { GlobeIcon } from "../../icons";
import { cn } from "../../utils/cn";

export interface FaviconProps extends ComponentProps<"div"> {
  url: string;
}

export function Favicon({ url, className, ...props }: FaviconProps) {
  const { metadata } = useUrlMetadata(url);

  return (
    <div className={cn("lb-favicon", className)} {...props}>
      {metadata?.icon ? (
        <img src={metadata?.icon} alt={metadata?.title} />
      ) : (
        <GlobeIcon className="lb-favicon-fallback" />
      )}
    </div>
  );
}
