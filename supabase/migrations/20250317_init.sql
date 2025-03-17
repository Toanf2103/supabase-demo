-- Tạo extension nếu chưa có
create extension if not exists "uuid-ossp";

-- Function tự động cập nhật updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Function tự động tạo profile khi có user mới
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id)
    values (new.id);
    return new;
end;
$$ language plpgsql;

-- Tạo bảng profiles
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    display_name text,
    avatar_url text,
    bio text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Bật RLS
alter table public.profiles enable row level security;

-- Trigger cho updated_at
drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
    before update on public.profiles
    for each row
    execute procedure public.handle_updated_at();

-- Trigger tự động tạo profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();

-- RLS Policies
drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
    on profiles for select
    using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = id);

-- Cấp quyền
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to anon, authenticated, service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- Tạo bảng products
create table if not exists public.products (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    price decimal(10,2) not null,
    image_url text,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Bật RLS cho products
alter table public.products enable row level security;

-- Trigger cho updated_at của products
drop trigger if exists handle_products_updated_at on public.products;
create trigger handle_products_updated_at
    before update on public.products
    for each row
    execute procedure public.handle_updated_at();

-- RLS Policies cho products
drop policy if exists "Products are viewable by everyone" on products;
create policy "Products are viewable by everyone"
    on products for select
    using (true);

drop policy if exists "Users can create their own products" on products;
create policy "Users can create their own products"
    on products for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own products" on products;
create policy "Users can update their own products"
    on products for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete their own products" on products;
create policy "Users can delete their own products"
    on products for delete
    using (auth.uid() = user_id);

-- Cấp quyền cho products
grant all on public.products to anon, authenticated, service_role;

-- Tạo bảng orders
create table if not exists public.orders (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    status text not null default 'pending',
    total_amount decimal(10,2) not null default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    check (status in ('pending', 'processing', 'completed', 'cancelled'))
);

-- Bật RLS cho orders
alter table public.orders enable row level security;

-- Trigger cho updated_at của orders
drop trigger if exists handle_orders_updated_at on public.orders;
create trigger handle_orders_updated_at
    before update on public.orders
    for each row
    execute procedure public.handle_updated_at();

-- RLS Policies cho orders
drop policy if exists "Users can view their own orders" on orders;
create policy "Users can view their own orders"
    on orders for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own orders" on orders;
create policy "Users can create their own orders"
    on orders for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own orders" on orders;
create policy "Users can update their own orders"
    on orders for update
    using (auth.uid() = user_id);

-- Cấp quyền cho orders
grant all on public.orders to anon, authenticated, service_role;

-- Tạo bảng order_items
create table if not exists public.order_items (
    id uuid default uuid_generate_v4() primary key,
    order_id uuid references public.orders(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    quantity integer not null check (quantity > 0),
    price_at_time decimal(10,2) not null,
    created_at timestamptz default now()
);

-- Bật RLS cho order_items
alter table public.order_items enable row level security;

-- RLS Policies cho order_items
drop policy if exists "Users can view their own order items" on order_items;
create policy "Users can view their own order items"
    on order_items for select
    using (
        exists (
            select 1 from orders
            where orders.id = order_items.order_id
            and orders.user_id = auth.uid()
        )
    );

drop policy if exists "Users can create their own order items" on order_items;
create policy "Users can create their own order items"
    on order_items for insert
    with check (
        exists (
            select 1 from orders
            where orders.id = order_items.order_id
            and orders.user_id = auth.uid()
        )
    );

-- Cấp quyền cho order_items
grant all on public.order_items to anon, authenticated, service_role;

-- Function để tính tổng tiền của order
create or replace function public.calculate_order_total()
returns trigger as $$
begin
    update orders
    set total_amount = (
        select sum(quantity * price_at_time)
        from order_items
        where order_id = new.order_id
    )
    where id = new.order_id;
    return new;
end;
$$ language plpgsql;

-- Trigger để tự động cập nhật tổng tiền của order
drop trigger if exists update_order_total on order_items;
create trigger update_order_total
    after insert or update or delete on order_items
    for each row
    execute procedure public.calculate_order_total();

-- Cấp quyền cho service_role
grant service_role to postgres;
grant service_role to authenticated;
grant service_role to anon;

-- Cấp quyền cho schema auth
grant usage on schema auth to service_role;
grant all on all tables in schema auth to service_role;
grant all on all sequences in schema auth to service_role;

-- Cấp quyền cho schema public
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
