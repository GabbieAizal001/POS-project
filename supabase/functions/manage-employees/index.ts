import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Explicitly define the types we expect to receive in the request body
    interface RequestBody {
      action?: string;
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
      employeeId?: string;
      userId?: string;
    }

    // Safely parse the body to prevent JSON errors
    let body: RequestBody;
    try {
      body = await req.json() as RequestBody;
    } catch (err) {
      throw new Error("Failed to parse request body");
    }

    const { action, name, email, password, role, phone, employeeId, userId } = body;

    if (action === 'create') {
      if (!name || !email || !password || !role || !phone || !employeeId) {
        throw new Error('Missing required fields for create: name, email, password, role, phone, employeeId')
      }

      const { data, error } = await supabaseAdminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          phone,
          employee_id: employeeId
        },
        app_metadata: {
          role: role.toLowerCase()
        }
      })

      if (error) throw error

      return new Response(JSON.stringify({ success: true, user: data.user }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    } else if (action === 'update') {
      if (!userId) {
        throw new Error('Missing "userId" for "update" action.');
      }

      // Define what can be updated
      const updateData: { password?: string; user_metadata?: any; app_metadata?: any } = {};

      if (password) {
        updateData.password = password;
      }

      const userMetadata: { full_name?: string; phone?: string } = {};
      const appMetadata: { role?: string } = {};

      if (name) userMetadata.full_name = name;
      if (phone) userMetadata.phone = phone;
      if (role) appMetadata.role = role.toLowerCase();

      if (Object.keys(userMetadata).length > 0) {
        updateData.user_metadata = userMetadata;
      }
      if (Object.keys(appMetadata).length > 0) {
        updateData.app_metadata = appMetadata;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("No update data provided.");
      }

      const { data, error } = await supabaseAdminClient.auth.admin.updateUserById(userId, updateData);

      if (error) throw error

      return new Response(JSON.stringify({ success: true, user: data.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else if (action === 'list') {
      const { data: { users }, error } = await supabaseAdminClient.auth.admin.listUsers();
      if (error) throw error;

      // Map the raw user data to the format the frontend expects
      const formattedUsers = users.map(user => ({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        role: user.app_metadata?.role || 'N/A',
        phone: user.user_metadata?.phone || '',
        email: user.email || '',
        employeeId: user.user_metadata?.employee_id || ''
      }));

      return new Response(JSON.stringify({ success: true, users: formattedUsers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else if (action === 'delete') {
      if (!userId) {
        throw new Error('Missing userId for delete')
      }

      const { error } = await supabaseAdminClient.auth.admin.deleteUser(userId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, deleted_user_id: userId }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      throw new Error('Missing or invalid action: must be "create", "update", "delete", or "list"')
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})