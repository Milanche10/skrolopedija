# Jedini Dockerfile za API — gradi se iz KORENA repo-a (Render podrazumevani kontekst).
# Lokalno ga koristi i docker-compose (build.context: .). Putanje su api/ prefiksirane.
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api/prisma ./prisma
RUN npx prisma generate
COPY api/ .
EXPOSE 4000
# Produkcijski start (Render). docker-compose override-uje ovo dev verzijom sa --watch.
CMD ["sh", "-c", "npx prisma migrate deploy && (node scripts/seed.js || echo 'Seed preskočen — server se ipak pokreće.') && npm start"]
