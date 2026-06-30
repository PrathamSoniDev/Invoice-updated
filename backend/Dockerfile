#############################################
# Builder Stage
#############################################

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

#############################################
# Production Stage
#############################################

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY prisma ./prisma

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs uploads

EXPOSE 5001

CMD ["node","dist/src/main.js"]