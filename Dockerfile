# Trinqa backend (Fastify BFF). Built from the repo root because the backend
# reads ../deployments/testnet.json at boot (policy contract id + wasm hash).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app/backend

FROM base AS build
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN pnpm build

FROM base AS prod-deps
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787
WORKDIR /app/backend
COPY --from=prod-deps /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/package.json ./
COPY deployments /app/deployments
# Operation store writes here (ephemeral unless a volume is mounted at /app/backend/.data).
RUN mkdir -p .data && chown node:node .data
USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
