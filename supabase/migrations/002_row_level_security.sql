-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user ID from JWT (Clerk)
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'userId')::text
  )
$$ LANGUAGE SQL STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.user_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.user_id());

-- Organizations policies
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.user_id() AND role = 'owner'
    )
  );

-- Organization memberships policies
CREATE POLICY "Members can view memberships of their orgs"
  ON organization_memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Admins can manage memberships"
  ON organization_memberships FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.user_id() AND role IN ('owner', 'admin')
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    user_id = auth.user_id() OR
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.user_id()
    )
  );
