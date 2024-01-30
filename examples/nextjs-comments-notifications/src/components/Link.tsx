"use client";

import DefaultLink from "next/link";
import { useSearchParams } from "next/navigation";
import { ComponentProps, useMemo } from "react";

interface LinkProps extends Omit<ComponentProps<typeof DefaultLink>, "href"> {
  href?: string;
}

const PLACEHOLDER_BASE_URL = "https://localhost:9999";
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

/**
 * A version of `next/link` with `href` as optional and which persists query params.
 */
export function Link({ href, ...props }: LinkProps) {
  const params = useSearchParams();
  const hrefWithQueryParams = useMemo(() => {
    if (!href) {
      return;
    }

    const isAbsolute = ABSOLUTE_URL_REGEX.test(href);
    const url = new URL(href, isAbsolute ? undefined : PLACEHOLDER_BASE_URL);

    params.forEach((value, param) => {
      url.searchParams.set(param, value);
    });

    return isAbsolute ? url.href : url.href.replace(PLACEHOLDER_BASE_URL, "");
  }, [href, params]);

  return hrefWithQueryParams ? (
    <DefaultLink href={hrefWithQueryParams} {...props} />
  ) : (
    <a {...props} />
  );
}
