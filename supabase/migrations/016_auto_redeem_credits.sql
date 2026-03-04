-- Add auto_redeem column to user_credits
ALTER TABLE user_credits ADD COLUMN auto_redeem BOOLEAN NOT NULL DEFAULT false;

-- RLS: users can read their own auto_redeem (existing SELECT policy covers this)
-- RLS: users can update their own auto_redeem
CREATE POLICY "Users can update own auto_redeem"
  ON user_credits
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);
