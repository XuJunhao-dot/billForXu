# billForXu all-in-one image: Caddy(:80) + API(:8080) + Web(:3000)

# syntax=docker/dockerfile:1

ARG TARGETPLATFORM

FROM --platform=$TARGETPLATFORM docker.m.daocloud.io/library/node:20-alpine AS deps
WORKDIR /app

# backend deps
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm ci

# frontend deps
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci

FROM --platform=$TARGETPLATFORM docker.m.daocloud.io/library/node:20-alpine AS builder
WORKDIR /app

# reduce build memory usage (colima default memory is small)
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_DISABLE_TURBOPACK=1 \
    NODE_OPTIONS=--max-old-space-size=1024

COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY backend ./backend
COPY frontend ./frontend

RUN cd backend && npm run build
RUN cd frontend && npm run build

FROM --platform=$TARGETPLATFORM docker.m.daocloud.io/library/node:20-alpine AS runner
WORKDIR /app

# runtime packages
# - switch apk repo mirror to improve reliability in CN networks
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
  && apk add --no-cache supervisor caddy

# copy built apps
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend

# caddy config + supervisor
COPY infra/allinone/Caddyfile /etc/caddy/Caddyfile
COPY infra/allinone/supervisord.conf /etc/supervisord.conf

# persist sqlite data in container fs (no external volume available)
RUN mkdir -p /app/backend/data

ENV NODE_ENV=production
EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
