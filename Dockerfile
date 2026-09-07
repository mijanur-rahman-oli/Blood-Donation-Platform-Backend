FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "dist/server.js"]
