-- Restrict ai_config read access to admins only.
-- Previously any authenticated user could read system prompts and model config.
DROP POLICY IF EXISTS "Authenticated users can read ai_config" ON ai_config;

CREATE POLICY "Admins can read ai_config"
  ON ai_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
