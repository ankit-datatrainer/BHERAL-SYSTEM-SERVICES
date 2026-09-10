-- =============================================================================
-- Bheral Systems & Services — Supabase Database Migration
-- All tables are prefixed with 'bss_'
-- Run this in the Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Catalogue: Products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  image text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  price numeric NOT NULL,
  original_price numeric,
  discount numeric,
  processor text,
  ram numeric,
  storage numeric,
  storage_type text,
  gpu text,
  screen_size numeric,
  operating_system text,
  condition text,
  rating numeric,
  review_count integer DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  warranty text,
  is_new boolean DEFAULT false,
  featured boolean DEFAULT false,
  description text,
  specifications jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Catalogue: Repair Services
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_repair_services (
  id text PRIMARY KEY,
  name text NOT NULL,
  device text NOT NULL,
  icon text NOT NULL,
  description text NOT NULL,
  time text NOT NULL,
  popular boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. Valuation Multipliers Config
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_valuation_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_orders (
  id text PRIMARY KEY,
  phone text NOT NULL,
  status integer NOT NULL DEFAULT 0,
  customer jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Sell Requests (Doorstep Valuation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_sell_requests (
  id text PRIMARY KEY,
  phone text NOT NULL,
  status integer NOT NULL DEFAULT 0,
  estimate numeric NOT NULL,
  device jsonb NOT NULL,
  customer jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. Repair Requests (Bookings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_repair_requests (
  id text PRIMARY KEY,
  phone text NOT NULL,
  status integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL,
  customer jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. Contact Form Messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_contact_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  subject text,
  enquiry_type text DEFAULT 'general',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. Marketplace: Sellers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_sellers (
  phone text PRIMARY KEY,
  pin_hash text NOT NULL,
  name text NOT NULL,
  email text,
  city text,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. Marketplace: Listings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_listings (
  id text PRIMARY KEY,
  seller_phone text NOT NULL REFERENCES public.bss_sellers(phone) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  brand text,
  model text,
  description text,
  condition text NOT NULL,
  price numeric NOT NULL,
  negotiable boolean DEFAULT true,
  specs jsonb DEFAULT '{}'::jsonb,
  images text[] DEFAULT '{}',
  city text,
  pincode text,
  status text NOT NULL DEFAULT 'active',
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. Marketplace: Orders / Offers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_listing_orders (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES public.bss_listings(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text,
  buyer_city text,
  message text,
  offer_price numeric,
  status integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bss_products_category ON public.bss_products (category);
CREATE INDEX IF NOT EXISTS idx_bss_products_brand ON public.bss_products (brand);
CREATE INDEX IF NOT EXISTS idx_bss_products_price ON public.bss_products (price);
CREATE INDEX IF NOT EXISTS idx_bss_listings_status ON public.bss_listings (status);
CREATE INDEX IF NOT EXISTS idx_bss_listings_seller ON public.bss_listings (seller_phone);
CREATE INDEX IF NOT EXISTS idx_bss_listing_orders_listing ON public.bss_listing_orders (listing_id);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bss_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_repair_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_valuation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_listing_orders ENABLE ROW LEVEL SECURITY;

-- Public read policies for catalogue
DROP POLICY IF EXISTS "Public can read products" ON public.bss_products;
CREATE POLICY "Public can read products" ON public.bss_products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read repair services" ON public.bss_repair_services;
CREATE POLICY "Public can read repair services" ON public.bss_repair_services FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read valuation config" ON public.bss_valuation_config;
CREATE POLICY "Public can read valuation config" ON public.bss_valuation_config FOR SELECT TO anon, authenticated USING (true);

-- Public insert policies for customer requests
DROP POLICY IF EXISTS "Public can insert orders" ON public.bss_orders;
CREATE POLICY "Public can insert orders" ON public.bss_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert sell requests" ON public.bss_sell_requests;
CREATE POLICY "Public can insert sell requests" ON public.bss_sell_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert repair requests" ON public.bss_repair_requests;
CREATE POLICY "Public can insert repair requests" ON public.bss_repair_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert contact messages" ON public.bss_contact_messages;
CREATE POLICY "Public can insert contact messages" ON public.bss_contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Public read policies for listings (active only)
DROP POLICY IF EXISTS "Public can read active listings" ON public.bss_listings;
CREATE POLICY "Public can read active listings" ON public.bss_listings FOR SELECT TO anon, authenticated USING (status = 'active');

DROP POLICY IF EXISTS "Public can insert listing orders" ON public.bss_listing_orders;
CREATE POLICY "Public can insert listing orders" ON public.bss_listing_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Stored Procedures / RPC Functions
-- -----------------------------------------------------------------------------

-- 1. Unified Tracking: bss_track_request
CREATE OR REPLACE FUNCTION public.bss_track_request(p_id text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  -- Order
  SELECT jsonb_build_object(
    'id', id,
    'type', 'order',
    'status', status,
    'phone', phone,
    'created_at', created_at,
    'payload', jsonb_build_object(
      'items', items,
      'subtotal', subtotal,
      'deliveryFee', delivery_fee,
      'total', total,
      'customer', customer
    )
  ) INTO v_res
  FROM public.bss_orders
  WHERE id = p_id AND phone = p_phone;

  IF v_res IS NOT NULL THEN
    RETURN v_res;
  END IF;

  -- Sell request
  SELECT jsonb_build_object(
    'id', id,
    'type', 'sell',
    'status', status,
    'phone', phone,
    'created_at', created_at,
    'payload', jsonb_build_object(
      'device', device,
      'customer', customer,
      'estimate', estimate
    )
  ) INTO v_res
  FROM public.bss_sell_requests
  WHERE id = p_id AND phone = p_phone;

  IF v_res IS NOT NULL THEN
    RETURN v_res;
  END IF;

  -- Repair request
  SELECT jsonb_build_object(
    'id', id,
    'type', 'repair',
    'status', status,
    'phone', phone,
    'created_at', created_at,
    'payload', jsonb_build_object(
      'details', details,
      'customer', customer
    )
  ) INTO v_res
  FROM public.bss_repair_requests
  WHERE id = p_id AND phone = p_phone;

  IF v_res IS NOT NULL THEN
    RETURN v_res;
  END IF;

  -- Marketplace order
  SELECT jsonb_build_object(
    'id', o.id,
    'type', 'marketplace',
    'status', o.status,
    'phone', o.buyer_phone,
    'created_at', o.created_at,
    'payload', jsonb_build_object(
      'listingId', l.id,
      'listingTitle', l.title,
      'listingPrice', l.price,
      'offerPrice', o.offer_price,
      'buyerName', o.buyer_name,
      'buyerPhone', o.buyer_phone
    )
  ) INTO v_res
  FROM public.bss_listing_orders o
  JOIN public.bss_listings l ON l.id = o.listing_id
  WHERE o.id = p_id AND o.buyer_phone = p_phone;

  RETURN v_res;
END;
$$;

-- 2. Seller Authentication: bss_seller_auth
CREATE OR REPLACE FUNCTION public.bss_seller_auth(
  p_phone text,
  p_pin text,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller public.bss_sellers%ROWTYPE;
BEGIN
  IF length(trim(p_phone)) <> 10 THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;

  IF length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'INVALID_PIN';
  END IF;

  SELECT * INTO v_seller FROM public.bss_sellers WHERE phone = p_phone;

  IF FOUND THEN
    IF v_seller.pin_hash = crypt(p_pin, v_seller.pin_hash) THEN
      RETURN jsonb_build_object(
        'phone', v_seller.phone,
        'name', v_seller.name,
        'email', v_seller.email,
        'city', v_seller.city,
        'createdAt', v_seller.created_at
      );
    ELSE
      RAISE EXCEPTION 'BAD_CREDENTIALS';
    END IF;
  ELSE
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
      RAISE EXCEPTION 'NAME_REQUIRED';
    END IF;

    INSERT INTO public.bss_sellers (phone, pin_hash, name, email, city)
    VALUES (p_phone, crypt(p_pin, gen_salt('bf', 8)), p_name, p_email, p_city)
    RETURNING * INTO v_seller;

    RETURN jsonb_build_object(
      'phone', v_seller.phone,
      'name', v_seller.name,
      'email', v_seller.email,
      'city', v_seller.city,
      'createdAt', v_seller.created_at
    );
  END IF;
END;
$$;

-- 3. Seller Dashboard: bss_seller_dashboard
CREATE OR REPLACE FUNCTION public.bss_seller_dashboard(p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_hash text;
  v_listings jsonb;
  v_orders jsonb;
BEGIN
  SELECT pin_hash INTO v_pin_hash FROM public.bss_sellers WHERE phone = p_phone;
  IF NOT FOUND OR v_pin_hash <> crypt(p_pin, v_pin_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb)
  INTO v_listings
  FROM (
    SELECT * FROM public.bss_listings
    WHERE seller_phone = p_phone
    ORDER BY created_at DESC
  ) l;

  SELECT coalesce(jsonb_agg(row_to_json(o)), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT ord.*, lst.title AS listing_title, lst.price AS listing_price
    FROM public.bss_listing_orders ord
    JOIN public.bss_listings lst ON lst.id = ord.listing_id
    WHERE lst.seller_phone = p_phone
    ORDER BY ord.created_at DESC
  ) o;

  RETURN jsonb_build_object('listings', v_listings, 'orders', v_orders);
END;
$$;

-- 4. Create Listing: bss_listing_create
CREATE OR REPLACE FUNCTION public.bss_listing_create(
  p_phone text,
  p_pin text,
  p_id text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_hash text;
BEGIN
  SELECT pin_hash INTO v_pin_hash FROM public.bss_sellers WHERE phone = p_phone;
  IF NOT FOUND OR v_pin_hash <> crypt(p_pin, v_pin_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  INSERT INTO public.bss_listings (
    id,
    seller_phone,
    title,
    category,
    brand,
    model,
    description,
    condition,
    price,
    negotiable,
    specs,
    images,
    city,
    pincode,
    status
  ) VALUES (
    p_id,
    p_phone,
    p_payload->>'title',
    p_payload->>'category',
    p_payload->>'brand',
    p_payload->>'model',
    p_payload->>'description',
    p_payload->>'condition',
    (p_payload->>'price')::numeric,
    coalesce((p_payload->>'negotiable')::boolean, true),
    coalesce(p_payload->'specs', '{}'::jsonb),
    coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(p_payload->'images') t(x)), '{}'),
    p_payload->>'city',
    p_payload->>'pincode',
    'active'
  );
END;
$$;

-- 5. Update Listing Status: bss_listing_set_status
CREATE OR REPLACE FUNCTION public.bss_listing_set_status(
  p_phone text,
  p_pin text,
  p_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_hash text;
  v_owner text;
BEGIN
  SELECT pin_hash INTO v_pin_hash FROM public.bss_sellers WHERE phone = p_phone;
  IF NOT FOUND OR v_pin_hash <> crypt(p_pin, v_pin_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  SELECT seller_phone INTO v_owner FROM public.bss_listings WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_owner <> p_phone THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  UPDATE public.bss_listings
  SET status = p_status
  WHERE id = p_id;
END;
$$;

-- 6. Update Listing Order Status: bss_listing_order_set_status
CREATE OR REPLACE FUNCTION public.bss_listing_order_set_status(
  p_phone text,
  p_pin text,
  p_id text,
  p_status integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_hash text;
  v_owner text;
BEGIN
  SELECT pin_hash INTO v_pin_hash FROM public.bss_sellers WHERE phone = p_phone;
  IF NOT FOUND OR v_pin_hash <> crypt(p_pin, v_pin_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  SELECT l.seller_phone INTO v_owner
  FROM public.bss_listing_orders o
  JOIN public.bss_listings l ON l.id = o.listing_id
  WHERE o.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_owner <> p_phone THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  UPDATE public.bss_listing_orders
  SET status = p_status
  WHERE id = p_id;
END;
$$;
