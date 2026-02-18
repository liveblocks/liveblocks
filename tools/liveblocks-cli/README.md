# liveblocks

Liveblocks command line interface.

## Commands

### `liveblocks dev`

Start the local Liveblocks dev server (requires [Bun](https://bun.sh)):

```bash
npx liveblocks dev
```

Options:

| Flag           | Description                                                                                   | Default                             |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-p`, `--port` | Port to listen on.                                                                            | `1153`                              |
| `--host`       | Host to bind to.                                                                              | `localhost`                         |
| `--ci`         | Best defaults for running the Liveblocks dev server in CI. Alias of `--ephemeral --no-check`. |                                     |
| `--ephemeral`  | Do not persist state between restarts. Recommended for running unit tests.                    | Persist between restarts by default |
| `--no-check`   | Skip project setup check on start.                                                            | Checks by default                   |
| `-h`, `--help` | Show help.                                                                                    |                                     |

By default, the dev server scans your project on startup for common Liveblocks
call sites (`<LiveblocksProvider>`, `createClient()`, `new Liveblocks()`) and
warns if any of them are missing a `baseUrl` pointing at the local dev server.
Use `--no-check` to skip this check.

### `liveblocks upgrade`

Upgrade all `@liveblocks/*` packages in your project to the same version:

```bash
npx liveblocks upgrade         # upgrades to "latest"
npx liveblocks upgrade 2.15.0  # upgrades to a specific version
```

Automatically detects your package manager (npm, yarn, pnpm, or bun).

## Run with Docker

```bash
docker run -p 1153:1153 ghcr.io/liveblocks/cli dev
```

See [DOCKER.md](./DOCKER.md) for configuration, volume mounts, and image
signature verification.

## License

Licensed under the GNU Affero General Public License v3.0 or later, Copyright ©
2021-present [Liveblocks](https://liveblocks.io).

See [LICENSE-AGPL-3.0](./LICENSE) for more information.
