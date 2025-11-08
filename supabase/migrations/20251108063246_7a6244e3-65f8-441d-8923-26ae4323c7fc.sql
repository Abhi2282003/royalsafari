-- Step 1: Add CUSTOMER type to booking_type enum
ALTER TYPE booking_type ADD VALUE IF NOT EXISTS 'CUSTOMER';

-- Step 2: Add phone and age columns to booking_items
ALTER TABLE public.booking_items 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS age integer;