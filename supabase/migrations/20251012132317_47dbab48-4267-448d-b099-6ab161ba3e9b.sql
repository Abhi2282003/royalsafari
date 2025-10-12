-- Create the two system users with username-style emails
-- Note: Supabase requires email format, so we'll use username@system.local format

-- Insert admin user (we'll need to create this via Supabase Auth API later)
-- Username: admin, Password: 1001

-- Insert staff user (we'll need to create this via Supabase Auth API later)  
-- Username: shekhar, Password: 1001

-- Create a function to create users (admin only)
CREATE OR REPLACE FUNCTION public.create_system_user(
  p_username text,
  p_password text,
  p_full_name text,
  p_role app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Only admins can create users
  IF NOT has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Create email format from username
  v_email := p_username || '@system.local';

  -- This function will be called from the frontend using Supabase Admin API
  -- For now, return success - actual user creation will be handled by admin panel
  
  RETURN json_build_object(
    'success', true,
    'email', v_email
  );
END;
$$;