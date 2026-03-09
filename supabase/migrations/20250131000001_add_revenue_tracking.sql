
-- Add revenue tracking fields to revenuecat_events table
ALTER TABLE revenuecat_events 
ADD COLUMN IF NOT EXISTS price_in_purchased_currency NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(10, 2);

-- Create index for revenue queries
CREATE INDEX IF NOT EXISTS idx_revenuecat_events_amount_usd 
ON revenuecat_events(amount_usd) WHERE amount_usd IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN revenuecat_events.price_in_purchased_currency IS 'Price in the original purchase currency';
COMMENT ON COLUMN revenuecat_events.currency IS 'Currency code (USD, EUR, etc.)';
COMMENT ON COLUMN revenuecat_events.amount_usd IS 'Price converted to USD for reporting';
