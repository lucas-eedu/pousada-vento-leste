FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "--workspace", "@pousada/web"]
