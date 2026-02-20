-- Drop the old Clerk-specific auth.user_id() function
DROP FUNCTION IF EXISTS auth.user_id();

-- Profiles policies (using native auth.uid())
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Organizations policies
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Organization memberships policies
CREATE POLICY "Members can view memberships of their orgs"
  ON organization_memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage memberships"
  ON organization_memberships FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Referral codes policies
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes FOR SELECT
  USING (user_id = auth.uid());

-- Referrals policies
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Credit transactions policies
CREATE POLICY "Users can view their own credit transactions"
  ON credit_transactions FOR SELECT
  USING (user_id = auth.uid());

-- User credits policies
CREATE POLICY "Users can view their own credits"
  ON user_credits FOR SELECT
  USING (user_id = auth.uid());
