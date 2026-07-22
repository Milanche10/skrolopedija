-- Skriveni bedževi / easter-egg-ovi po korisniku (aditivno, bez gubitka podataka).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "flags" JSONB;
