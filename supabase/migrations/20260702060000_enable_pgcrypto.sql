-- `crypt()` and `gen_salt()` (used throughout the seed migrations, and by
-- the SUPER_ADMIN bootstrap migration) live in the `pgcrypto` extension —
-- unlike `gen_random_uuid()`, which has been a native built-in since
-- Postgres 13 and needs no extension.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
