// supabase/functions/auth/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// Các headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Biến môi trường Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Tạo supabase client với service role key (quyền admin)
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// Hàm để xác thực JWT và lấy thông tin user
async function getUserFromToken(token) {
  try {
    // Xác thực token và lấy thông tin user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

serve(async (req) => {
  // Xử lý CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    console.log("=== DEBUG INFO ===");
    console.log("Full URL:", req.url);
    console.log("URL Path:", url.pathname);
    console.log("HTTP Method:", req.method);
    
    // Cải thiện cách xử lý đường dẫn
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    console.log("Path Parts:", pathParts);
    console.log("Path Parts Length:", pathParts.length);
    
    // Xác định endpoint - hỗ trợ cả URL ngắn và dài
    let endpoint = '';
    if (pathParts.includes('auth')) {
      // Lấy phần tử ngay sau 'auth'
      const authIndex = pathParts.indexOf('auth');
      endpoint = pathParts[authIndex + 1] || '';
    }
    console.log("Extracted Endpoint:", endpoint);
    console.log("=== END DEBUG ===");

    // Kiểm tra endpoint hợp lệ
    const validEndpoints = ['register', 'login', 'me'];
    if (!validEndpoints.includes(endpoint)) {
      console.log("Invalid endpoint detected:", endpoint);
      return new Response(
        JSON.stringify({ error: 'Not found', path: url.pathname, endpoint }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Xử lý các public routes (không yêu cầu token)
    if ((endpoint === 'register' || endpoint === 'login') && req.method === 'POST') {
      console.log("Processing public route:", endpoint);
      if (endpoint === 'register') {
        console.log("Processing register request");
        
        const { email, password, display_name } = await req.json();
        console.log("Register payload:", { email, display_name }); // Không log password
        
        // Validate inputs
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Tạo user mới
          console.log("Creating new user...");
          const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${supabaseUrl}`,
              data: {
                display_name: display_name || ''
              }
            }
          });

          if (authError) {
            console.error("Error creating user:", authError);
            return new Response(
              JSON.stringify({ error: authError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log("User created successfully:", authData.user.id);

          // Cập nhật profile nếu có display_name
          if (display_name && authData.user) {
            try {
              console.log("Updating profile display_name...");
              const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ 
                  display_name: display_name 
                })
                .eq('id', authData.user.id)
                .select()
                .single();

              if (profileError) {
                console.error("Error updating profile:", profileError);
                // Không return lỗi vì user đã được tạo thành công
              } else {
                console.log("Profile updated successfully:", profileData);
              }
            } catch (profileError) {
              console.error("Exception updating profile:", profileError);
              // Không return lỗi vì user đã được tạo thành công
            }
          }

          return new Response(
            JSON.stringify({ 
              message: 'User registered successfully',
              user: authData.user 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (error) {
          console.error("Exception in register process:", error);
          return new Response(
            JSON.stringify({ error: error.message || 'Error creating user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      if (endpoint === 'login') {
        console.log("Processing login request");
        
        const { email, password } = await req.json();
        
        // Validate inputs
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Xác thực user
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Các protected routes (yêu cầu token)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ROUTE: /me - Lấy thông tin user hiện tại
    if (endpoint === 'me' && req.method === 'GET') {
      console.log("Processing me request");
      
      const { user, error } = await getUserFromToken(token);
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Lấy thêm thông tin profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return new Response(
        JSON.stringify({ user, profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route không hợp lệ
    return new Response(
      JSON.stringify({ error: 'Not found', path: url.pathname, endpoint }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in function:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});