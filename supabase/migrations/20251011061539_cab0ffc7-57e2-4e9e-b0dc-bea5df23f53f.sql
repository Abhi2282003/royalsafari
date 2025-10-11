-- Expand RLS to allow STAFF to manage master data

-- AGENTS
DROP POLICY IF EXISTS "Admins can manage agents" ON agents;
CREATE POLICY "Admins and Staff can insert agents"
ON agents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can update agents"
ON agents
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can delete agents"
ON agents
FOR DELETE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));

-- ROUTES
DROP POLICY IF EXISTS "Admins can manage routes" ON routes;
CREATE POLICY "Admins and Staff can insert routes"
ON routes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can update routes"
ON routes
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can delete routes"
ON routes
FOR DELETE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));

-- ROUTE_BUSES
DROP POLICY IF EXISTS "Admins can manage route-buses" ON route_buses;
CREATE POLICY "Admins and Staff can insert route-buses"
ON route_buses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can update route-buses"
ON route_buses
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));
CREATE POLICY "Admins and Staff can delete route-buses"
ON route_buses
FOR DELETE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));