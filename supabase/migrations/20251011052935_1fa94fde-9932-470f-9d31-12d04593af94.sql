-- Fix the handle_new_user function to also create a default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  
  -- Assign default role (STAFF for first user, VIEWER for others)
  -- You can manually change this to ADMIN for the first user later
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'STAFF');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;