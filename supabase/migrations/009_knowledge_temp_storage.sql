-- =============================================
-- Supabase Storage bucket for temporary knowledge file staging
-- Workaround for Vercel's 4.5MB serverless function body limit
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-temp',
  'knowledge-temp',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json',
    'text/csv',
    'text/html'
  ]
);

-- =============================================
-- Storage RLS Policies (admin-only access)
-- =============================================

CREATE POLICY "Admins can upload to knowledge-temp"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'knowledge-temp'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can read from knowledge-temp"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'knowledge-temp'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete from knowledge-temp"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'knowledge-temp'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );
