-- Create receiver_names table for managing who receives payments
CREATE TABLE public.receiver_names (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receiver_names ENABLE ROW LEVEL SECURITY;

-- Public access policies (single user app, no auth needed)
CREATE POLICY "Anyone can view receiver names" ON public.receiver_names FOR SELECT USING (true);
CREATE POLICY "Anyone can insert receiver names" ON public.receiver_names FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update receiver names" ON public.receiver_names FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete receiver names" ON public.receiver_names FOR DELETE USING (true);

-- Create company_settings table for header customization
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'ROYAL TOURS & TRAVELS',
  address_line text DEFAULT '',
  phone_numbers text DEFAULT '',
  logo_url text DEFAULT NULL,
  footer_note text DEFAULT 'Wish you a Happy Journey',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert company settings" ON public.company_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update company settings" ON public.company_settings FOR UPDATE USING (true);

-- Create manual_tickets table
CREATE TABLE public.manual_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_no text NOT NULL UNIQUE,
  booking_date_time timestamp with time zone NOT NULL DEFAULT now(),
  journey_date date NOT NULL,
  passenger_name text NOT NULL,
  passenger_phone text NOT NULL,
  with_family_friends text DEFAULT NULL,
  address text DEFAULT NULL,
  tours_to text NOT NULL,
  no_of_tourist integer NOT NULL DEFAULT 1,
  seat_no text DEFAULT NULL,
  rep_time text DEFAULT NULL,
  dep_time text DEFAULT NULL,
  amount numeric NOT NULL DEFAULT 0,
  pnr_no text DEFAULT NULL,
  bus_no text DEFAULT NULL,
  branch text DEFAULT NULL,
  notes text DEFAULT NULL,
  collection_status text NOT NULL DEFAULT 'UNPAID' CHECK (collection_status IN ('PAID', 'UNPAID')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_tickets ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Anyone can view manual tickets" ON public.manual_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert manual tickets" ON public.manual_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update manual tickets" ON public.manual_tickets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete manual tickets" ON public.manual_tickets FOR DELETE USING (true);

-- Create ticket_payments table
CREATE TABLE public.ticket_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.manual_tickets(id) ON DELETE CASCADE,
  received_by_name text NOT NULL,
  payment_mode text NOT NULL DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'OTHER')),
  paid_amount numeric NOT NULL,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_payments ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Anyone can view ticket payments" ON public.ticket_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ticket payments" ON public.ticket_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ticket payments" ON public.ticket_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ticket payments" ON public.ticket_payments FOR DELETE USING (true);

-- Create daily ticket counter sequence function
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date text;
  today_count integer;
  new_ticket_no text;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  -- Count tickets created today
  SELECT COUNT(*) + 1 INTO today_count
  FROM public.manual_tickets
  WHERE DATE(booking_date_time) = CURRENT_DATE;
  
  -- Generate ticket number: ROYAL-YYYYMMDD-0001
  new_ticket_no := 'ROYAL-' || today_date || '-' || LPAD(today_count::text, 4, '0');
  
  RETURN new_ticket_no;
END;
$$;

-- Insert default company settings
INSERT INTO public.company_settings (company_name, address_line, phone_numbers, footer_note)
VALUES ('ROYAL TOURS & TRAVELS', 'Pune, Maharashtra', '+91 9876543210', 'Wish you a Happy Journey');

-- Insert default receiver names
INSERT INTO public.receiver_names (name) VALUES ('Owner'), ('Counter1'), ('Counter2'), ('Manager');