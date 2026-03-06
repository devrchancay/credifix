-- Add daily usage limits to plans (messages and files per day)
-- These are configurable per plan via the admin UI

UPDATE plans SET limits = COALESCE(limits, '{}'::jsonb) || '{"messages_daily": 15, "files_daily": 5}'::jsonb WHERE slug = 'free';
UPDATE plans SET limits = COALESCE(limits, '{}'::jsonb) || '{"messages_daily": 50, "files_daily": 10}'::jsonb WHERE slug = 'pro';
UPDATE plans SET limits = COALESCE(limits, '{}'::jsonb) || '{"messages_daily": 200, "files_daily": 50}'::jsonb WHERE slug = 'enterprise';
