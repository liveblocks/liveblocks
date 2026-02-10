<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# `@liveblocks/server`

<p>
  <a href="https://npmjs.org/package/@liveblocks/server">
    <img src="https://img.shields.io/npm/v/@liveblocks/server?style=flat&label=npm&color=c33" alt="NPM" />
  </a>
  <a href="https://bundlephobia.com/package/@liveblocks/server">
    <img src="https://img.shields.io/bundlephobia/minzip/@liveblocks/server?style=flat&label=size&color=09f" alt="Size" />
  </a>
  <a href="https://github.com/liveblocks/liveblocks/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/liveblocks/liveblocks?style=flat&label=license&color=f80" alt="License" />
  </a>
</p>

`@liveblocks/server` provides the APIs to run a Liveblocks server yourself.

## Installation

```
bun install @liveblocks/server
```

## Architecture

```mermaid
classDiagram
  Room --> Store : store
  Room --> "0+" Session : sessions
  Session --> WebSocket

  class Room {
    +roomId
    +load()
    +createTicket(version) Ticket
    +startBrowserSession(Ticket ticket, WebSocket socket)
    +handleRaw(Ticket ticket, data)
    +endBrowserSession(Ticket ticket, code, reason)
  }

  class Store {
    +getString(key)
    +getNumber(key)
    +put(key, value)
  }

  class Session{
    +version
    +actor
    +nonce
    +createdAt
    +lastPong
    +sendPong()
    +sendServerMsg()
  }

  class WebSocket {
    +...
  }
```

## License

Licensed under the GNU Affero General Public License v3.0 or later,
Copyright © 2021-present [Liveblocks](https://liveblocks.io).

See [LICENSE-AGPL-3.0](../../licenses/LICENSE-AGPL-3.0) for more information.
