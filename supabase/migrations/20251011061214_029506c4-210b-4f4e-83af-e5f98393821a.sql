-- Update buses RLS policy to allow STAFF to insert
DROP POLICY IF EXISTS "Admins can manage buses" ON buses;

CREATE POLICY "Admins and Staff can insert buses" 
ON buses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'STAFF'::app_role));

CREATE POLICY "Admins can update buses" 
ON buses 
FOR UPDATE 
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete buses" 
ON buses 
FOR DELETE 
USING (has_role(auth.uid(), 'ADMIN'::app_role));