-- Create customer_care table for TapTapSend
-- This table stores customer care contact information

CREATE TABLE IF NOT EXISTS customer_care (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT,
  website TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE customer_care DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for customer_care
CREATE TRIGGER update_customer_care_updated_at
  BEFORE UPDATE ON customer_care
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial customer care information (update with your actual contact details)
INSERT INTO customer_care (whatsapp, website, email, address)
VALUES (
  '+8801234567890',  -- WhatsApp number (include country code, no spaces or dashes)
  'https://www.taptapsend.com',  -- Website URL
  'support@taptapsend.com',  -- Email address
  '123 Main Street, Dhaka, Bangladesh'  -- Physical address
)
ON CONFLICT DO NOTHING;

