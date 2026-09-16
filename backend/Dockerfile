FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /workspace
# better-sqlite3 是原生模块：slim 镜像缺少编译工具链，需临时装上
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY backend backend
RUN npm exec --workspace backend prisma generate && npm run build --workspace backend

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/backend/package.json ./backend/package.json
COPY --from=build /workspace/backend/dist ./backend/dist
COPY --from=build /workspace/backend/prisma ./backend/prisma
RUN mkdir -p /data && chown -R node:node /workspace /data
USER node
WORKDIR /workspace/backend
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "../node_modules/.bin/prisma migrate deploy && node dist/server.js"]
