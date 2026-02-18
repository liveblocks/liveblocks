# ------------------------------------------------------------------
# Liveblocks Dev Server — Docker Image
#
#   docker build --build-arg CLI_VERSION=1.0.3 tools/liveblocks-cli/
# ------------------------------------------------------------------

FROM oven/bun:1-alpine@sha256:9028ee7a60a04777190f0c3129ce49c73384d3fc918f3e5c75f5af188e431981

ARG CLI_VERSION=latest
ARG VERSION=dev
LABEL org.opencontainers.image.source="https://github.com/liveblocks/liveblocks"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.title="Liveblocks Dev Server"
LABEL org.opencontainers.image.description="Local development server for Liveblocks"

RUN addgroup -g 1001 liveblocks && \
    adduser -u 1001 -G liveblocks -h /home/liveblocks -D liveblocks

WORKDIR /app

RUN bun install liveblocks@${CLI_VERSION}

COPY scripts/docker-healthcheck.ts ./scripts/

RUN mkdir -p /app/.liveblocks && chown liveblocks:liveblocks /app/.liveblocks
VOLUME /app/.liveblocks

USER liveblocks

ENV LIVEBLOCKS_DEVSERVER_HOST=0.0.0.0
ENV LIVEBLOCKS_DEVSERVER_PORT=1153
EXPOSE 1153

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["bun", "run", "scripts/docker-healthcheck.ts"]

ENTRYPOINT ["bun", "run", "node_modules/liveblocks/dist/index.js", "dev"]
