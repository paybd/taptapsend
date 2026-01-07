-- Create profiles table for TapTapSend
-- This table stores user profile information

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 100.00 NOT NULL,
  password TEXT NOT NULL,
  selfie_url TEXT,
  doc_url TEXT,
  country TEXT,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create paymentAccounts table for TapTapSend
-- This table stores payment account information (bKash, bank accounts, etc.)

CREATE TABLE IF NOT EXISTS paymentAccounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL, -- 'bkash', 'bank', 'card', etc.
  account_number TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on account_type for faster lookups
CREATE INDEX IF NOT EXISTS paymentAccounts_account_type_idx ON paymentAccounts(account_type);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS paymentAccounts_is_active_idx ON paymentAccounts(is_active);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE paymentAccounts DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for paymentAccounts
CREATE TRIGGER update_paymentAccounts_updated_at
  BEFORE UPDATE ON paymentAccounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a sample bKash account (you can modify this)
INSERT INTO paymentAccounts (account_type, account_number, account_name, is_active)
VALUES ('bkash', '01712345678', 'TapTapSend bKash Account', true)
ON CONFLICT DO NOTHING;

-- Create autodeposit table for TapTapSend
-- This table stores automatic deposit records that need to be verified and processed

CREATE TABLE IF NOT EXISTS autodeposit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10, 2) NOT NULL,
  last_3_digits TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on amount and last_3_digits for faster lookups
CREATE INDEX IF NOT EXISTS autodeposit_amount_last3_idx ON autodeposit(amount, last_3_digits);

-- Create index on is_processed for filtering unprocessed deposits
CREATE INDEX IF NOT EXISTS autodeposit_is_processed_idx ON autodeposit(is_processed);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE autodeposit DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for autodeposit
CREATE TRIGGER update_autodeposit_updated_at
  BEFORE UPDATE ON autodeposit
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create deposit table for TapTapSend
-- This table stores bank and bKash deposit requests with receipt images

CREATE TABLE IF NOT EXISTS deposit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id UUID REFERENCES paymentAccounts(id) NOT NULL,
  deposit_type TEXT DEFAULT 'bank', -- 'bank', 'bkash'
  amount DECIMAL(10, 2) NOT NULL, -- Original deposit amount in user's currency
  amount_to_add DECIMAL(10, 2), -- Calculated amount to add to balance in BDT
  receipt_url TEXT, -- NULL for bKash deposits, URL for bank deposits
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS deposit_user_id_idx ON deposit(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS deposit_status_idx ON deposit(status);

-- Create index on deposit_type for filtering
CREATE INDEX IF NOT EXISTS deposit_deposit_type_idx ON deposit(deposit_type);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS deposit_created_at_idx ON deposit(created_at);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE deposit DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for deposit
CREATE TRIGGER update_deposit_updated_at
  BEFORE UPDATE ON deposit
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create rates table for TapTapSend
-- This table stores exchange rates for different countries

CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  original_rate DECIMAL(10, 4) NOT NULL,
  company_rate DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on country_code for faster lookups
CREATE INDEX IF NOT EXISTS rates_country_code_idx ON rates(country_code);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS rates_updated_at_idx ON rates(updated_at);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for rates
CREATE TRIGGER update_rates_updated_at
  BEFORE UPDATE ON rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create transactions table for TapTapSend
-- This table stores all user transactions

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'mobile_banking', 'bank_transfer', 'mobile_recharge', 'pay_bill', etc.
  mfs_service TEXT, -- 'bkash', 'nagad', 'rocket' (for mobile_banking type)
  account_type TEXT, -- 'agent', 'personal' (for mobile_banking type)
  phone TEXT, -- Phone number for mobile_recharge type
  last_digit TEXT, -- Last digits of PIN/account for mobile_banking type
  bank_name TEXT, -- Bank name for bank_transfer type
  recipient_account_number TEXT, -- Recipient account number for bank_transfer
  recipient_account_name TEXT, -- Recipient account name for bank_transfer
  amount DECIMAL(10, 2) NOT NULL,
  commission DECIMAL(10, 2) DEFAULT 0.00, -- 2.5% commission on transfer amount
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create banners table for TapTapSend
-- This table stores carousel banner images for the home screen

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disable Row Level Security (RLS) for this table
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- Create trigger to automatically update updated_at for banners
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

