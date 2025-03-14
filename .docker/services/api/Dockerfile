FROM node:22.14-slim AS base

WORKDIR /app

COPY ./api/package.json ./api/package-lock.json ./

RUN npm install

COPY ./api ./

RUN npm run build

FROM node:22.14-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY ./api/package*.json ./

COPY --from=base /app/dist ./dist

RUN npm ci --only=production

CMD [ "node", "./dist/index.js" ]