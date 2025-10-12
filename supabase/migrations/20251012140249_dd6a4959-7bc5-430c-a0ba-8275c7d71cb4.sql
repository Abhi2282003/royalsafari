-- Create cities/destinations table for autocomplete
CREATE TABLE IF NOT EXISTS public.destinations (
  id SERIAL PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- Policies for destinations
CREATE POLICY "All authenticated users can view destinations"
ON public.destinations
FOR SELECT
USING (true);

CREATE POLICY "Admins and Staff can insert destinations"
ON public.destinations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));

CREATE POLICY "Admins and Staff can update destinations"
ON public.destinations
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));

-- Insert common Indian cities
INSERT INTO public.destinations (city_name) VALUES
  ('Mumbai'),
  ('Pune'),
  ('Bangalore'),
  ('Delhi'),
  ('Chennai'),
  ('Kolkata'),
  ('Hyderabad'),
  ('Ahmedabad'),
  ('Surat'),
  ('Jaipur'),
  ('Nagpur'),
  ('Goa')
ON CONFLICT (city_name) DO NOTHING;