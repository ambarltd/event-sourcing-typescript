FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install -g nodemon ts-node typescript
RUN npm install
USER node
EXPOSE 8080
CMD ["nodemon", "--watch", "src", "--ext", "ts,json", "--exec", "ts-node", "src/index.ts"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]