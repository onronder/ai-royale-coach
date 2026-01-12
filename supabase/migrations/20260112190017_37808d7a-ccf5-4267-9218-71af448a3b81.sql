-- Add win-back email tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS winback_email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Create win-back campaign history table for audit trail
CREATE TABLE winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_email TEXT NOT NULL,
  promo_code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all winback campaigns"
  ON winback_campaigns FOR SELECT
  USING (public.has_admin_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert winback campaigns"
  ON winback_campaigns FOR INSERT
  WITH CHECK (public.has_admin_role(auth.uid(), 'admin'));