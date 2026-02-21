ALTER TABLE "user" ADD COLUMN IF NOT EXISTS encrypted_openrouter_key VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS openrouter_api_key VARCHAR;
