// supabase/functions/shared/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Các biến môi trường được cấu hình trong Supabase Dashboard
// Tất cả các khóa được lưu trữ an toàn trong Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Tạo supabase client với service role key (quyền admin)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// Tạo supabase client với anon key (quyền hạn chế)
export const supabaseAnon = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Tạo client từ access token của user
export const getSupabaseClient = (accessToken: string) => {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
};

// Hàm để xác thực JWT và lấy thông tin user
export const getUserFromToken = async (token: string) => {
  try {
    // Xác thực token và lấy thông tin user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};