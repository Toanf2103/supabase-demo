// supabase/functions/products/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../shared/cors.ts';
import { supabaseAdmin, getUserFromToken } from '../shared/supabase.ts';

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const params = url.searchParams;

    // Lấy token từ Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    // Kiểm tra xác thực cho mọi route
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user, error } = await getUserFromToken(token);
    
    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: /products - Lấy tất cả sản phẩm
    if (!path || path === 'products') {
      if (req.method === 'GET') {
        // Lấy tất cả sản phẩm
        let query = supabaseAdmin
          .from('products')
          .select('*, profiles(display_name)');
        
        // Lọc theo user_id nếu có
        const userIdFilter = params.get('user_id');
        if (userIdFilter) {
          query = query.eq('user_id', userIdFilter);
        }
        
        // Sắp xếp
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Đánh dấu sản phẩm thuộc về user hiện tại
        const productsWithOwnership = data.map(product => ({
          ...product,
          is_owner: product.user_id === user.id
        }));

        return new Response(
          JSON.stringify(productsWithOwnership),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Thêm sản phẩm mới
      if (req.method === 'POST') {
        const productData = await req.json();
        
        // Validate input
        if (!productData.name || !productData.price) {
          return new Response(
            JSON.stringify({ error: 'Name and price are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Thêm user_id vào dữ liệu
        const newProduct = {
          ...productData,
          user_id: user.id
        };
        
        const { data, error } = await supabaseAdmin
          .from('products')
          .insert(newProduct)
          .select()
          .single();
          
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Route: /products/:id - Xử lý sản phẩm cụ thể
    if (path && path !== 'products') {
      const productId = path;
      
      // Kiểm tra sản phẩm tồn tại và thuộc về user không
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
        
      if (productError) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // GET - Lấy thông tin sản phẩm
      if (req.method === 'GET') {
        return new Response(
          JSON.stringify({ ...product, is_owner: product.user_id === user.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // PUT - Cập nhật sản phẩm
      if (req.method === 'PUT') {
        // Kiểm tra quyền sở hữu
        if (product.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'You do not have permission to update this product' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const updateData = await req.json();
        
        // Loại bỏ user_id khỏi dữ liệu cập nhật để ngăn thay đổi chủ sở hữu
        delete updateData.user_id;
        delete updateData.id;
        
        const { data, error } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('id', productId)
          .select()
          .single();
          
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // DELETE - Xóa sản phẩm
      if (req.method === 'DELETE') {
        // Kiểm tra quyền sở hữu
        if (product.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'You do not have permission to delete this product' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { error } = await supabaseAdmin
          .from('products')
          .delete()
          .eq('id', productId);
          
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ message: 'Product deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route không hợp lệ
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});