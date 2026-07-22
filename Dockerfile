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
# Produkcijski start (Render). Seed NE ide na svaki boot (usporava cold-start ~40s i
# nepotreban je — baza je već popunjena). Pusti ga jednom sa SEED_ON_START=true ako treba.
# Migrate/seed ne smeju da blokiraju start servera (zato ';' i '|| true'), inače cold Neon
# obori ceo servis. Za ručni seed: `SEED_ON_START=true` env ili `npm run seed`.
CMD ["sh", "-c", "npx prisma migrate deploy || echo 'migrate preskočen'; [ \"$SEED_ON_START\" = 'true' ] && (node scripts/seed.js || echo 'seed preskočen'); npm start"]
