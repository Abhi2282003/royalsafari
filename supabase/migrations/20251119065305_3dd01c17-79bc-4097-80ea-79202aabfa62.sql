-- Add UPDATE and DELETE policies for booking_items
CREATE POLICY "Staff and admins can update booking items"
ON booking_items
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF'::app_role)
);

CREATE POLICY "Staff and admins can delete booking items"
ON booking_items
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF'::app_role)
);

-- Add UPDATE and DELETE policies for bookings
CREATE POLICY "Staff and admins can update bookings"
ON bookings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF'::app_role)
);

CREATE POLICY "Staff and admins can delete bookings"
ON bookings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF'::app_role)
);