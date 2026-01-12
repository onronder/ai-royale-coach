-- Add polar_discount_id to winback_campaigns table
ALTER TABLE public.winback_campaigns
ADD COLUMN polar_discount_id uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.winback_campaigns.polar_discount_id IS 'The Polar discount ID (UUID) used to pre-apply the discount at checkout';