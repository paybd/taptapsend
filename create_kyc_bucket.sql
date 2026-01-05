-- Create KYC storage bucket for TapTapSend
-- This bucket stores selfie and document images for KYC verification

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc', 'kyc', true)
ON CONFLICT (id) DO NOTHING;

