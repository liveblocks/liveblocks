# ------------------------------------------------------------------
# Liveblocks Dev Server — Docker Image
#
#   docker build --build-arg CLI_VERSION=1.0.3 tools/liveblocks-cli/
# ------------------------------------------------------------------

FROM oven/bun:1@sha256:856da45d07aeb62eb38ea3e7f9e1794c0143a4ff63efb00e6c4491b627e2a521

ARG CLI_VERSION=latest
ARG VERSION=dev
LABEL org.opencontainers.image.source="https://github.com/liveblocks/liveblocks"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.title="Liveblocks Dev Server"
LABEL org.opencontainers.image.description="Local development server for Liveblocks"

RUN groupadd --gid 1001 liveblocks && \
    useradd --uid 1001 --gid liveblocks --create-home liveblocks

WORKDIR /app

RUN bun install liveblocks@${CLI_VERSION}

COPY LICENSE ./
COPY docker-healthcheck.ts ./

RUN mkdir -p /app/.liveblocks && chown liveblocks:liveblocks /app/.liveblocks
VOLUME /app/.liveblocks

USER liveblocks

ENV HOST=0.0.0.0
ENV PORT=1153
EXPOSE 1153

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["bun", "run", "docker-healthcheck.ts"]

ENTRYPOINT ["/bin/sh", "-c", "exec bun run node_modules/liveblocks/dist/index.js dev${PORT:+ --port $PORT}"]
