# PhonePe Integration Guide

## 1. Supabase Schema Update
Run the following SQL in your Supabase SQL Editor to create the necessary tables:

```sql
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

-- Disable RLS to match your current schema pattern
ALTER TABLE device_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

## 2. Environment Variables
Add the following variables to your `.env` (or Vercel environment settings):

```env
# PhonePe Production Credentials
PHONEPE_MERCHANT_ID=M22EDB2E***** # Replace with your full Merchant ID
PHONEPE_SALT_KEY=your-api-key-here # Replace with your Salt Key
PHONEPE_SALT_INDEX=1
PHONEPE_HOST=https://api.phonepe.com/apis/hermes

# App URL (Must be your production domain)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 3. PhonePe Business Dashboard Setup
1. **API Key:** Ensure you have the Salt Key and Salt Index (usually 1).
2. **Callback URL:** The system automatically sends the callback URL as `https://your-domain.com/api/payments/callback`. You don't need to set a static one in the PhonePe dashboard unless required by their support.
3. **Whitelisting:** If PhonePe asks for IP whitelisting, you may need to provide your Vercel/Hosting provider's outbound IPs.

## 4. Admin Workflow
1. Go to `/admin/dashboard`.
2. Click on the **Device Pricing** tab.
3. Add the names of your devices (e.g., "Model X") and their yearly subscription price.
4. Note: The name must exactly match the `device_name` assigned to customers for the price to appear in their billing section.

## 5. Customer Workflow
1. Customers log in and see a "Billing" tab.
2. They can see their devices and the prices you set.
3. Clicking "Renew" or "Extend" will redirect them to PhonePe.
4. After payment, they are redirected back, and the device `subscription_end` is automatically extended by 1 year.
