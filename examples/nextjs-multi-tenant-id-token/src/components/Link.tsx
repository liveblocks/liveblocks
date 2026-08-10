"use client";

import DefaultLink from "next/link";
import { useSearchParams } from "next/navigation";
import { ComponentProps, useMemo } from "react";
import { setQueryParams } from "../example";

interface LinkProps extends Omit<ComponentProps<typeof DefaultLink>, "href"> {
  href?: string;
}

const PRESERVED_QUERY_PARAMS = ["exampleId", "examplePreview"];

/**
 * This version of `Link` is used to preserve query parameters when deploying
 * an example on liveblocks.io. You can ignore it completely if you run the
 * example locally, and use the default `next/link` component instead.
 */
export function Link({ href, ...props }: LinkProps) {
  const params = useSearchParams();
  const hrefWithQueryParams = useMemo(() => {
    if (!href) {
      return;
    }

    const preservedQueryParams: Record<string, string> = {};

    params.forEach((value, param) => {
      if (PRESERVED_QUERY_PARAMS.includes(param)) {
        preservedQueryParams[param] = value;
      }
    });

    return setQueryParams(href, preservedQueryParams);
  }, [href, params]);

  return hrefWithQueryParams ? (
    <DefaultLink href={hrefWithQueryParams} {...props} />
  ) : (
    <a {...props} />
  );
}
