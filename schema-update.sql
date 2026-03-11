-- Device pricing table
CREATE TABLE device_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments tracking table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_transaction_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
  phonepe_reference_id TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for payment lookups
CREATE INDEX idx_payments_merchant_transaction_id ON payments(merchant_transaction_id);

-- Enable RLS (or disable if following the project pattern)
ALTER TABLE device_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
