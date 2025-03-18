-- Tạo extension cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------
-- FUNCTIONS & TRIGGERS
-------------------------

-- Function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function tự động tạo profile khi có user mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Lỗi khi tạo profile cho user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------
-- TABLES
-------------------------

-- Bảng profiles - Thông tin người dùng
-- Email đã được lưu trong auth.users nên không cần lưu lại
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Bảng products - Sản phẩm
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-------------------------
-- INDICES
-------------------------

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-------------------------
-- TRIGGERS
-------------------------

-- Trigger updated_at cho bảng profiles
DROP TRIGGER IF EXISTS set_updated_at_on_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_on_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Trigger tạo profile khi user được tạo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at cho bảng products
DROP TRIGGER IF EXISTS set_updated_at_on_products ON public.products;
CREATE TRIGGER set_updated_at_on_products
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-------------------------
-- RLS (Row Level Security)
-------------------------

-- Bật RLS cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies cho profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Bật RLS cho bảng products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies cho products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone"
    ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products"
    ON products FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products"
    ON products FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products"
    ON products FOR DELETE USING (auth.uid() = user_id);

-------------------------
-- PERMISSIONS
-------------------------

-- Cấp quyền cho schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Cấp quyền cho bảng profiles
GRANT ALL ON public.profiles TO anon, authenticated, service_role;

-- Cấp quyền cho bảng products
GRANT ALL ON public.products TO anon, authenticated, service_role;

-- Cấp quyền cho sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Cấp quyền bổ sung cho service_role
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-------------------------
-- COMMENT
-------------------------
COMMENT ON TABLE public.profiles IS 'Lưu thông tin profile của người dùng. Email đã được lưu trong auth.users nên không cần lưu lại ở đây';
COMMENT ON TABLE public.products IS 'Lưu thông tin sản phẩm và người tạo sản phẩm đó';