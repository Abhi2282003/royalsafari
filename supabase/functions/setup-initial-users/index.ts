import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const users = [
      {
        email: 'admin@system.local',
        password: '1001',
        full_name: 'Admin',
        role: 'ADMIN'
      },
      {
        email: 'shekhar@system.local',
        password: '1001',
        full_name: 'Shekhar',
        role: 'STAFF'
      }
    ]

    const results = []

    for (const userData of users) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUser?.users.some(u => u.email === userData.email)

      if (userExists) {
        results.push({ email: userData.email, status: 'already_exists' })
        continue
      }

      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      })

      if (createError) {
        results.push({ email: userData.email, status: 'error', error: createError.message })
        continue
      }

      // Update the user role
      if (newUser.user) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', newUser.user.id)

        if (roleError) {
          results.push({ email: userData.email, status: 'created_but_role_error', error: roleError.message })
        } else {
          results.push({ email: userData.email, status: 'success', role: userData.role })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
