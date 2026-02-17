# Liveblocks Dev Server — Docker

Run the Liveblocks dev server in a container.

## Quick start

```bash
docker run -p 1153:1153 ghcr.io/liveblocks/cli
```

The server is ready when `curl http://localhost:1153/health` returns
`{"status":"ok"}`.

## Persisting room data

SQLite databases for room storage are written to `/app/.liveblocks` inside the
container. Mount a volume to persist data across restarts:

```bash
docker run -p 1153:1153 \
  -v liveblocks-data:/app/.liveblocks \
  ghcr.io/liveblocks/cli
```

## Verifying image signatures

Images are signed with [cosign](https://docs.sigstore.dev/cosign/) using keyless
(Sigstore OIDC) signing.

### Verify the image signature

```bash
cosign verify \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "github\\.com/liveblocks/liveblocks" \
  ghcr.io/liveblocks/cli
```

### Verify the SBOM attestation

Each image has an attached [SBOM](https://www.cisa.gov/sbom) (Software Bill of
Materials) — a machine-readable inventory of every package included in the
image. You can verify its authenticity:

```bash
cosign verify-attestation \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "github\\.com/liveblocks/liveblocks" \
  --type cyclonedx \
  ghcr.io/liveblocks/cli
```
