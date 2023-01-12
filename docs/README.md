<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Documentation

This directory contains the content behind https://liveblocks.io/docs.

We welcome contributions, feel free to open issues or pull requests with the
`docs` label.

## Editing pages

Pages are authored in [MDX](https://mdxjs.com/) and stored in the
[`/docs/pages`](./pages) directory.

### Custom syntaxes

Through custom Markdown plugins, the Liveblocks documentation supports various
custom syntaxes:

#### Custom heading `id`

Headings get permalinks automatically generated, but adding `[#id]` in a heading
will override its generated `id`.

**Example:** `### Heading [#custom-id]` will output
`<h3 id="custom-id">Heading</h3>`.

#### Hiding headings from table of contents and search

Headings get included in tables of content and search automatically, but adding
`[@hidden]` in a heading will hide it from these.

**Example:** `### Heading [@hidden]` will prevent the heading from being listed
in tables of content and search.

#### Adding search keywords

Adding `[@keywords=[...]]` in a heading will attach custom keywords leveraged
when searching.

**Example:** `### Heading [@keywords=["lorem", "ipsum"]]` will attach search
keywords ("lorem" and "ipsum") to this heading.

### Custom components

Various custom [MDX components](https://mdxjs.com/) are available for use in
pages without being imported.

## Editing navigation

The navigation structure is authored through the
[`/docs/routes.json`](./routes.json) file. The structure is an array of
categories, which are arrays of pages, and then pages can also have subpages.

Pages can specify a `path` which will both reflect its URL and its location in
the [`/docs/pages`](./pages) directory.

```json
{
  "title": "React",
  "path": "/get-started/react" // Will fetch the page from /docs/pages/get-started/react.mdx
}
```

If the MDX file location is different than its URL, the `file` property can be
used to explicitely specify the file location.

```json
{
  "title": "Overview",
  "path": "/",
  "file": "/index.mdx"
}
```

The `hidden` property can be specified if the page needs to be generated but
shouldn't appear in the navigation.

```json
{
  "title": "API v1 Endpoints",
  "hidden": true,
  "path": "/api-reference/rest-api-endpoints-v1"
}
```

Finally, existing pages (external or custom React pages) can specify an `href`
instead of a `path`.

```json
{
  "title": "System status",
  "href": "https://liveblocks.statuspage.io/"
}
```

## Creating new pages

Creating a new page is only a matter of creating a new MDX file in the
[`/docs/pages`](./pages) directory, then
[adding it to the navigation structure](#editing-navigation).

## Assets

Assets live under
[the private repository](https://github.com/liveblocks/liveblocks.io) behind
https://liveblocks.io.
