FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && (node scripts/seed.js || echo 'Seed preskočen zbog greške — server se ipak pokreće.') && npm run dev"]
