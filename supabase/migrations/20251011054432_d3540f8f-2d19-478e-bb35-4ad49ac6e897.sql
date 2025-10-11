-- Add destination column to booking_items
ALTER TABLE public.booking_items
ADD COLUMN destination TEXT;