declare module "postcss-lightningcss" {
  import type { Plugin } from "postcss";

  interface Options {
    browsers?: string;
  }

  const lightningcss: (options?: Options) => Plugin;

  export default lightningcss;
}

declare module "postcss-sort-media-queries" {
  import type { Plugin } from "postcss";

  const sortMediaQueries: () => Plugin;

  export default sortMediaQueries;
}
