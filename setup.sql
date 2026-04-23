-- Run this script once in your Neon database to create the auth tables
-- Connect to your tonycar database and run:

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.magic_tokens (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON auth.magic_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON auth.magic_tokens(email);

-- Clean up expired tokens automatically (optional, run periodically)
-- DELETE FROM auth.magic_tokens WHERE expires_at < NOW();
