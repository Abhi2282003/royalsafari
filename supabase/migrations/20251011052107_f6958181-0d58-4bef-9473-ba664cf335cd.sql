-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'STAFF', 'VIEWER');
CREATE TYPE public.booking_type AS ENUM ('AGENT', 'ONLINE', 'LUGGAGE', 'SELF');
CREATE TYPE public.memo_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE public.collection_status AS ENUM ('PENDING', 'PAID');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routes table
CREATE TABLE public.routes (
  id SERIAL PRIMARY KEY,
  route_name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buses table (with ownerName)
CREATE TABLE public.buses (
  id SERIAL PRIMARY KEY,
  bus_no TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Route-Bus mapping
CREATE TABLE public.route_buses (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  bus_id INTEGER NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, bus_id)
);

-- Agents table
CREATE TABLE public.agents (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings table
CREATE TABLE public.bookings (
  id SERIAL PRIMARY KEY,
  booking_date TIMESTAMPTZ NOT NULL,
  route_id INTEGER NOT NULL REFERENCES public.routes(id),
  bus_id INTEGER NOT NULL REFERENCES public.buses(id),
  type booking_type NOT NULL,
  agent_id INTEGER REFERENCES public.agents(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking items (seats/luggage)
CREATE TABLE public.booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_no TEXT,
  description TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Owner memos
CREATE TABLE public.owner_memos (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES public.routes(id),
  bus_id INTEGER NOT NULL REFERENCES public.buses(id),
  memo_date TIMESTAMPTZ NOT NULL,
  total_booking DECIMAL(14,2) NOT NULL,
  agent_commission DECIMAL(14,2) NOT NULL,
  our_profit DECIMAL(14,2) NOT NULL,
  owner_payable DECIMAL(14,2) NOT NULL,
  status memo_status NOT NULL DEFAULT 'PENDING',
  remarks TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent collections
CREATE TABLE public.agent_collections (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES public.agents(id),
  booking_id INTEGER NOT NULL REFERENCES public.bookings(id),
  due_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status collection_status NOT NULL DEFAULT 'PENDING',
  paid_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_collections ENABLE ROW LEVEL SECURITY;

-- Profiles policies (users can view own profile, admins can view all)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- User roles policies (admins can manage roles)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Routes policies (all authenticated users can view, admins can manage)
CREATE POLICY "All authenticated users can view routes" ON public.routes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage routes" ON public.routes
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Buses policies
CREATE POLICY "All authenticated users can view buses" ON public.buses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage buses" ON public.buses
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Route-Buses policies
CREATE POLICY "All authenticated users can view route-buses" ON public.route_buses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage route-buses" ON public.route_buses
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Agents policies
CREATE POLICY "All authenticated users can view agents" ON public.agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage agents" ON public.agents
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Bookings policies (staff and admin can create/view)
CREATE POLICY "Staff and admins can view bookings" ON public.bookings
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF') OR
    public.has_role(auth.uid(), 'VIEWER')
  );

CREATE POLICY "Staff and admins can create bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

-- Booking items policies
CREATE POLICY "Staff and admins can view booking items" ON public.booking_items
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF') OR
    public.has_role(auth.uid(), 'VIEWER')
  );

CREATE POLICY "Staff and admins can create booking items" ON public.booking_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

-- Owner memos policies
CREATE POLICY "Staff and admins can view memos" ON public.owner_memos
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF') OR
    public.has_role(auth.uid(), 'VIEWER')
  );

CREATE POLICY "Staff and admins can create memos" ON public.owner_memos
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

CREATE POLICY "Staff and admins can update memos" ON public.owner_memos
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

-- Agent collections policies
CREATE POLICY "Staff and admins can view collections" ON public.agent_collections
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF') OR
    public.has_role(auth.uid(), 'VIEWER')
  );

CREATE POLICY "Staff and admins can create collections" ON public.agent_collections
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

CREATE POLICY "Staff and admins can update collections" ON public.agent_collections
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'ADMIN') OR 
    public.has_role(auth.uid(), 'STAFF')
  );

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert seed data
INSERT INTO public.routes (route_name) VALUES 
  ('Pune – Nagpur'),
  ('Pune – Nashik');

INSERT INTO public.buses (bus_no, owner_name) VALUES 
  ('MH12AB1234', 'Mr. Patil'),
  ('MH12CD5678', 'Mr. Kale');

INSERT INTO public.route_buses (route_id, bus_id) VALUES 
  (1, 1), (1, 2), (2, 1), (2, 2);

INSERT INTO public.agents (agent_name) VALUES 
  ('Royal Travels'),
  ('City Tours');