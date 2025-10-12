-- Add COUNTER booking type to enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'booking_type' AND e.enumlabel = 'COUNTER'
  ) THEN
    ALTER TYPE booking_type ADD VALUE 'COUNTER';
  END IF;
END $$;

-- Add customer_name and surcharges columns to booking_items
ALTER TABLE public.booking_items 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS surcharges numeric DEFAULT 0;

-- Create index for better query performance on booking types
CREATE INDEX IF NOT EXISTS idx_bookings_type_date ON public.bookings(type, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);