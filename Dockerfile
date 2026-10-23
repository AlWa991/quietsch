# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN pnpm build

# ---- Runtime stage ----
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
