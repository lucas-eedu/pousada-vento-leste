# Imagem de publicação (Railway). Compila a API e a interface e executa
# somente a API, que também serve o build do React no mesmo endereço.
# Para desenvolvimento local, use o docker-compose.yml.

FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build --workspace @pousada/api && npm run build --workspace @pousada/web

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/apps/web/dist
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace @pousada/api && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
