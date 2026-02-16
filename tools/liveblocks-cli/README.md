# liveblocks

Liveblocks command line interface.

## Commands

### `liveblocks dev`

Start the local Liveblocks dev server (requires [Bun](https://bun.sh)):

```bash
npx liveblocks dev
```

Options:

| Flag           | Description       | Default     |
| -------------- | ----------------- | ----------- |
| `-p`, `--port` | Port to listen on | `1153`      |
| `--host`       | Host to bind to   | `localhost` |
| `-h`, `--help` | Show help         |             |

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
