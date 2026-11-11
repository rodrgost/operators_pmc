FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci
COPY . .
RUN npm run build:railway

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.output/public ./apps/web/.output/public
COPY scripts/serve-railway.mjs ./scripts/serve-railway.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/serve-railway.mjs"]
