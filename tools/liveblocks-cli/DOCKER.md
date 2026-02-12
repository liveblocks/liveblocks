# Liveblocks Dev Server — Docker

Run the Liveblocks dev server in a container.

## Quick start

```bash
docker pull ghcr.io/liveblocks/liveblocks/dev-server:latest

docker run -p 1153:1153 ghcr.io/liveblocks/liveblocks/dev-server:latest
```

The server is ready when `curl http://localhost:1153/health` returns `{"status":"ok"}`.

## Configuration

| Variable | Default   | Description                     |
| -------- | --------- | ------------------------------- |
| `PORT`   | `1153`    | Port the dev server listens on  |
| `HOST`   | `0.0.0.0` | Host to bind to                 |

```bash
docker run -p 8080:8080 -e PORT=8080 ghcr.io/liveblocks/liveblocks/dev-server:latest
```

## Persisting room data

SQLite databases for room storage are written to `/app/.liveblocks` inside the container. Mount a volume to persist data across restarts:

```bash
docker run -p 1153:1153 \
  -v liveblocks-data:/app/.liveblocks \
  ghcr.io/liveblocks/liveblocks/dev-server:latest
```

## Verifying image signatures

Images are signed with [cosign](https://docs.sigstore.dev/cosign/overview/) using keyless (Sigstore OIDC) signing.

### Verify the image signature

```bash
cosign verify \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "github\\.com/liveblocks/liveblocks" \
  ghcr.io/liveblocks/liveblocks/dev-server:latest
```

### Verify the SBOM attestation

```bash
cosign verify-attestation \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "github\\.com/liveblocks/liveblocks" \
  --type cyclonedx \
  ghcr.io/liveblocks/liveblocks/dev-server:latest
```
