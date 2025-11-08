-- Update RLS policies to allow public access for customer bookings

-- Allow anyone to create customer bookings
DROP POLICY IF EXISTS "Anyone can create customer bookings" ON public.bookings;
CREATE POLICY "Anyone can create customer bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (type = 'CUSTOMER');

-- Allow anyone to create customer booking items
DROP POLICY IF EXISTS "Anyone can create customer booking items" ON public.booking_items;
CREATE POLICY "Anyone can create customer booking items" 
ON public.booking_items 
FOR INSERT 
WITH CHECK (true);

-- Allow public to view active routes
DROP POLICY IF EXISTS "Public can view routes" ON public.routes;
CREATE POLICY "Public can view routes" 
ON public.routes 
FOR SELECT 
USING (active = true);

-- Allow public to view active buses
DROP POLICY IF EXISTS "Public can view buses" ON public.buses;
CREATE POLICY "Public can view buses" 
ON public.buses 
FOR SELECT 
USING (active = true);

-- Allow public to view active route_buses
DROP POLICY IF EXISTS "Public can view route_buses" ON public.route_buses;
CREATE POLICY "Public can view route_buses" 
ON public.route_buses 
FOR SELECT 
USING (active = true);

-- Allow public to view active destinations
DROP POLICY IF EXISTS "Public can view destinations" ON public.destinations;
CREATE POLICY "Public can view destinations" 
ON public.destinations 
FOR SELECT 
USING (active = true);