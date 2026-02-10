<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# `@liveblocks/devtools`

<p>
  <a href="https://chrome.google.com/webstore/detail/liveblocks-devtools/iiagocfmmhknpdalddkbiejnfmbmlffk">
    <img src="https://img.shields.io/badge/chrome-message?style=flat&logo=google%20chrome&color=666&logoColor=fff" alt="Chrome" />
  </a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/liveblocks-devtools/">
    <img src="https://img.shields.io/badge/firefox-message?style=flat&logo=firefox&color=f63&logoColor=fff" alt="Firefox" />
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/liveblocks-devtools/hfecmmnilleegmjaegkjjklnjbgadikg">
    <img src="https://img.shields.io/badge/edge-message?style=flat&logo=microsoft%20edge&color=18f&logoColor=fff" alt="Edge" />
  </a>
</p>

A browser extension that lets you inspect [Liveblocks](https://liveblocks.io)
realtime collaborative experiences.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/devtools/devtools.png" width="640" alt="Liveblocks DevTools" />

## Installation

Download the extension for your browser:

- [Chrome](https://chrome.google.com/webstore/detail/liveblocks-devtools/iiagocfmmhknpdalddkbiejnfmbmlffk)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/liveblocks-devtools/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/liveblocks-devtools/hfecmmnilleegmjaegkjjklnjbgadikg)

> Requires a **development** build of `@liveblocks/client` 0.19.4 or newer.

## Development

### Chrome

1. Run `turbo build` from this directory to build the browser extension
1. Navigate to [chrome://extensions](chrome://extensions)
1. Disable the production Liveblocks extension, if you already have it installed
   (it will conflict with the development version)
1. Enable "Developer mode"
1. Click "Load unpacked" and select the outputted `dist/chrome-mv3-prod`
   directory (which contains the `manifest.json` file)

### Firefox

1. Run `turbo build:firefox` from this directory to build the browser extension
1. Navigate to
   [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
1. Disable the production Liveblocks extension, if you already have it installed
   (it will conflict with the development version)
1. Click "Load temporary add-on..." and select the `manifest.json` file within
   the outputted `dist/firefox-mv2-prod` directory

### Testing with an example

1. First, link the example to
   [use local Liveblocks](https://github.com/liveblocks/liveblocks/blob/main/examples/README.md#linking-examples-to-the-local-liveblocks-packages)
1. Navigate to [chrome://extensions](chrome://extensions) or
   [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
1. Make sure to reload the extension after every build
1. After reloading the extension, reload the page
1. After reloading the extension, close/reopen the developer tools

> Reloading in the correct order is important for the changes to work.

## Documentation

Read the [documentation](https://liveblocks.io/docs) for guides and API
references.

## Examples

Explore our [collaborative examples](https://liveblocks.io/examples) to help you
get started.

> All examples are open-source and live in this repository, within
> [`/examples`](../../examples).

## Releases

See the [latest changes](https://github.com/liveblocks/liveblocks/releases) or
learn more about
[upcoming releases](https://github.com/liveblocks/liveblocks/milestones).

## Community

- [Discord](https://liveblocks.io/discord) - To get involved with the Liveblocks
  community, ask questions and share tips.
- [X](https://x.com/liveblocks) - To receive updates, announcements, blog posts,
  and general Liveblocks tips.

## License

Licensed under the Apache License 2.0, Copyright © 2021-present
[Liveblocks](https://liveblocks.io).

See [LICENSE](../../licenses/LICENSE-APACHE-2.0) for more information.
