"use client";

import DefaultLink from "next/link";
import { useSearchParams } from "next/navigation";
import { ComponentProps, useMemo } from "react";

interface LinkProps extends Omit<ComponentProps<typeof DefaultLink>, "href"> {
  href: string;
}

// `URL` doesn't support relative URLs, so we temporarily use a fake base URL.
const BASE_URL = "https://localhost:3000";

/**
 * A version of `next/link` that persists query params.
 */
export function Link({ href, ...props }: LinkProps) {
  const params = useSearchParams();
  const hrefWithQueryParams = useMemo(() => {
    const url = new URL(href, BASE_URL);

    params.forEach((value, param) => {
      url.searchParams.set(param, value);
    });

    return `${url}`.replace(BASE_URL, "");
  }, [href, params]);

  return <DefaultLink href={hrefWithQueryParams} {...props} />;
}
