-- =============================================================
-- Customer Management Platform — Supabase SQL Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- =============================================================

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  device_location TEXT,
  dashboard_url TEXT,
  subscription_start DATE DEFAULT CURRENT_DATE NOT NULL,
  subscription_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year') NOT NULL,
  is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: if devices table already exists, run this in Supabase SQL Editor:
-- ALTER TABLE devices ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE NOT NULL;

-- Indexes for performance
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_customer_id ON devices(customer_id);
CREATE INDEX idx_devices_subscription_end ON devices(subscription_end);

-- =============================================================
-- Row Level Security
-- The service role key bypasses RLS, so we disable it here.
-- If you want RLS, add policies that allow service_role access.
-- =============================================================
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;

-- OTP tokens table (custom OTP flow via Resend, bypassing Supabase Auth email)
CREATE TABLE otp_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_tokens_email ON otp_tokens(email);

ALTER TABLE otp_tokens DISABLE ROW LEVEL SECURITY;
