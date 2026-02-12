# liveblocks

Liveblocks command line interface.

## Docker

A Docker image is available for running the dev server in a container:

```bash
docker run -p 1153:1153 ghcr.io/liveblocks/liveblocks/dev-server:latest
```

To use a custom port:

```bash
docker run -p 8080:8080 -e PORT=8080 ghcr.io/liveblocks/liveblocks/dev-server:latest
```

See [DOCKER.md](./DOCKER.md) for persisting room data, verifying image signatures, and more.

## License

Licensed under the GNU Affero General Public License v3.0 or later, Copyright ©
2021-present [Liveblocks](https://liveblocks.io).

See [LICENSE-AGPL-3.0](./LICENSE) for more information.
