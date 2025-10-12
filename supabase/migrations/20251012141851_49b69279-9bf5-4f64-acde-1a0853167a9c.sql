-- Add from_city and to_city columns to routes table
ALTER TABLE public.routes 
ADD COLUMN from_city TEXT,
ADD COLUMN to_city TEXT;

-- Update existing routes to extract from/to cities from route_name
-- This is a best effort migration - manual review may be needed
UPDATE public.routes 
SET 
  from_city = SPLIT_PART(route_name, '-', 1),
  to_city = SPLIT_PART(route_name, '-', 2)
WHERE route_name LIKE '%-%';