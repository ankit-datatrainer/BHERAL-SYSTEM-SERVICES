-- =============================================================================
-- Buyer accounts, admin accounts, and invoices.
--
-- Same security model as the seller portal: credentials are verified with
-- pgcrypto inside SECURITY DEFINER functions, so the API never handles a
-- password hash and the anon key can never reach another account's data.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bss_buyers (
  phone      text PRIMARY KEY,
  pin_hash   text NOT NULL,
  name       text NOT NULL,
  email      text,
  city       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bss_admins (
  username   text PRIMARY KEY,
  pass_hash  text NOT NULL,
  name       text NOT NULL,
  role       text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bss_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bss_admins ENABLE ROW LEVEL SECURITY;

-- No policies: both tables are reachable only through the SECURITY DEFINER
-- functions below. The anon role gets nothing.
REVOKE ALL ON TABLE public.bss_buyers FROM anon, authenticated;
REVOKE ALL ON TABLE public.bss_admins FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_bss_listing_orders_buyer
  ON public.bss_listing_orders (buyer_phone);
CREATE INDEX IF NOT EXISTS idx_bss_orders_phone
  ON public.bss_orders (phone);

-- -----------------------------------------------------------------------------
-- 1. Buyer auth: registers on first use, signs in afterwards.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_buyer_auth(
  p_phone text,
  p_pin   text,
  p_name  text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_city  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_buyer public.bss_buyers%ROWTYPE;
BEGIN
  IF length(trim(p_phone)) <> 10 THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'INVALID_PIN';
  END IF;

  SELECT * INTO v_buyer FROM public.bss_buyers WHERE phone = p_phone;

  IF FOUND THEN
    IF v_buyer.pin_hash <> crypt(p_pin, v_buyer.pin_hash) THEN
      RAISE EXCEPTION 'BAD_CREDENTIALS';
    END IF;
  ELSE
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
      RAISE EXCEPTION 'NAME_REQUIRED';
    END IF;
    INSERT INTO public.bss_buyers (phone, pin_hash, name, email, city)
    VALUES (p_phone, crypt(p_pin, gen_salt('bf', 8)), p_name, p_email, p_city)
    RETURNING * INTO v_buyer;
  END IF;

  RETURN jsonb_build_object(
    'phone', v_buyer.phone,
    'name',  v_buyer.name,
    'email', v_buyer.email,
    'city',  v_buyer.city,
    'createdAt', v_buyer.created_at
  );
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 2. Buyer dashboard: every order placed with this phone number.
--
-- The seller's contact is attached only once the deal is confirmed
-- (status >= 2), matching the rule enforced in bss_track_request.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_buyer_dashboard(p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_buyer  public.bss_buyers%ROWTYPE;
  v_deals  jsonb;
  v_orders jsonb;
  v_sell   jsonb;
  v_repair jsonb;
BEGIN
  SELECT * INTO v_buyer FROM public.bss_buyers WHERE phone = p_phone;
  IF NOT FOUND OR v_buyer.pin_hash <> crypt(p_pin, v_buyer.pin_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  SELECT coalesce(jsonb_agg(q.d ORDER BY q.d->>'createdAt' DESC), '[]'::jsonb)
  INTO v_deals
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'status', o.status,
      'offerPrice', o.offer_price,
      'message', o.message,
      'createdAt', o.created_at,
      'listing', jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'category', l.category,
        'brand', l.brand,
        'model', l.model,
        'condition', l.condition,
        'price', l.price,
        'images', to_jsonb(l.images),
        'city', l.city,
        'status', l.status
      ),
      'seller', CASE WHEN o.status >= 2 THEN jsonb_build_object(
        'name', s.name, 'phone', s.phone, 'city', s.city
      ) ELSE NULL END
    ) AS d
    FROM public.bss_listing_orders o
    JOIN public.bss_listings l ON l.id = o.listing_id
    JOIN public.bss_sellers  s ON s.phone = l.seller_phone
    WHERE o.buyer_phone = p_phone
  ) q;

  SELECT coalesce(jsonb_agg(row_to_json(o) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_orders
  FROM public.bss_orders o WHERE o.phone = p_phone;

  SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_sell
  FROM public.bss_sell_requests r WHERE r.phone = p_phone;

  SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_repair
  FROM public.bss_repair_requests r WHERE r.phone = p_phone;

  RETURN jsonb_build_object(
    'buyer', jsonb_build_object(
      'phone', v_buyer.phone, 'name', v_buyer.name,
      'email', v_buyer.email, 'city', v_buyer.city,
      'createdAt', v_buyer.created_at
    ),
    'deals', v_deals,
    'orders', v_orders,
    'sellRequests', v_sell,
    'repairRequests', v_repair
  );
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 3. Invoice: for a shop order, or a confirmed marketplace deal.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_invoice(
  p_id    text,
  p_phone text,
  p_admin boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_order public.bss_orders%ROWTYPE;
  v_deal  record;
BEGIN
  SELECT * INTO v_order FROM public.bss_orders
  WHERE id = p_id AND (p_admin OR phone = p_phone);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'invoiceNo', 'BSS-INV-' || split_part(v_order.id, '-', 3),
      'kind', 'shop',
      'orderId', v_order.id,
      'issuedAt', v_order.created_at,
      'status', v_order.status,
      'billedTo', v_order.customer,
      'items', v_order.items,
      'subtotal', v_order.subtotal,
      'deliveryFee', v_order.delivery_fee,
      'total', v_order.total,
      'seller', jsonb_build_object(
        'name', 'Bheral Systems & Services',
        'phone', '9891993143',
        'city', 'New Delhi'
      )
    );
  END IF;

  SELECT o.*, l.title, l.price AS listing_price, l.category, l.condition,
         s.name AS seller_name, s.phone AS seller_phone, s.city AS seller_city
  INTO v_deal
  FROM public.bss_listing_orders o
  JOIN public.bss_listings l ON l.id = o.listing_id
  JOIN public.bss_sellers  s ON s.phone = l.seller_phone
  WHERE o.id = p_id AND (p_admin OR o.buyer_phone = p_phone);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- A peer-to-peer deal is only invoiceable once the seller has accepted.
  IF v_deal.status < 2 AND NOT p_admin THEN
    RAISE EXCEPTION 'NOT_CONFIRMED';
  END IF;

  RETURN jsonb_build_object(
    'invoiceNo', 'BSS-INV-' || split_part(v_deal.id, '-', 3),
    'kind', 'marketplace',
    'orderId', v_deal.id,
    'issuedAt', v_deal.created_at,
    'status', v_deal.status,
    'billedTo', jsonb_build_object(
      'name', v_deal.buyer_name, 'phone', v_deal.buyer_phone,
      'email', v_deal.buyer_email, 'city', v_deal.buyer_city
    ),
    'items', jsonb_build_array(jsonb_build_object(
      'name', v_deal.title,
      'qty', 1,
      'price', coalesce(v_deal.offer_price, v_deal.listing_price),
      'listPrice', v_deal.listing_price,
      'condition', v_deal.condition,
      'category', v_deal.category
    )),
    'subtotal', coalesce(v_deal.offer_price, v_deal.listing_price),
    'deliveryFee', 0,
    'total', coalesce(v_deal.offer_price, v_deal.listing_price),
    'seller', jsonb_build_object(
      'name', v_deal.seller_name, 'phone', v_deal.seller_phone, 'city', v_deal.seller_city
    )
  );
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 4. Admin auth
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_admin_auth(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_admin public.bss_admins%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.bss_admins WHERE username = lower(trim(p_username));
  IF NOT FOUND OR v_admin.pass_hash <> crypt(p_password, v_admin.pass_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;

  RETURN jsonb_build_object(
    'username', v_admin.username,
    'name', v_admin.name,
    'role', v_admin.role,
    'createdAt', v_admin.created_at
  );
END;
$fn$;

-- Raises unless the credentials are valid. Used by every admin mutation.
CREATE OR REPLACE FUNCTION public.bss_admin_assert(p_username text, p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_hash text;
  v_user text := lower(trim(p_username));
BEGIN
  SELECT pass_hash INTO v_hash FROM public.bss_admins WHERE username = v_user;
  IF NOT FOUND OR v_hash <> crypt(p_password, v_hash) THEN
    RAISE EXCEPTION 'BAD_CREDENTIALS';
  END IF;
  RETURN v_user;
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 5. Admin overview: the whole business in one payload.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_admin_overview(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.bss_admin_assert(p_username, p_password);

  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'sellers',       (SELECT count(*) FROM public.bss_sellers),
      'buyers',        (SELECT count(*) FROM public.bss_buyers),
      'listings',      (SELECT count(*) FROM public.bss_listings),
      'liveListings',  (SELECT count(*) FROM public.bss_listings WHERE status = 'active'),
      'deals',         (SELECT count(*) FROM public.bss_listing_orders),
      'shopOrders',    (SELECT count(*) FROM public.bss_orders),
      'sellRequests',  (SELECT count(*) FROM public.bss_sell_requests),
      'repairRequests',(SELECT count(*) FROM public.bss_repair_requests),
      'messages',      (SELECT count(*) FROM public.bss_contact_messages),
      'gmv',           (SELECT coalesce(sum(total), 0) FROM public.bss_orders)
                     + (SELECT coalesce(sum(coalesce(o.offer_price, l.price)), 0)
                        FROM public.bss_listing_orders o
                        JOIN public.bss_listings l ON l.id = o.listing_id
                        WHERE o.status >= 2)
    ),
    'sellers', (
      SELECT coalesce(jsonb_agg(q.x ORDER BY q.x->>'createdAt' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'phone', s.phone, 'name', s.name, 'email', s.email, 'city', s.city,
          'createdAt', s.created_at,
          'listings', (SELECT count(*) FROM public.bss_listings l WHERE l.seller_phone = s.phone)
        ) AS x FROM public.bss_sellers s
      ) q
    ),
    'buyers', (
      SELECT coalesce(jsonb_agg(q.x ORDER BY q.x->>'createdAt' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'phone', b.phone, 'name', b.name, 'email', b.email, 'city', b.city,
          'createdAt', b.created_at,
          'deals', (SELECT count(*) FROM public.bss_listing_orders o WHERE o.buyer_phone = b.phone),
          'orders', (SELECT count(*) FROM public.bss_orders o WHERE o.phone = b.phone)
        ) AS x FROM public.bss_buyers b
      ) q
    ),
    'listings', (
      SELECT coalesce(jsonb_agg(q.x ORDER BY q.x->>'createdAt' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'id', l.id, 'title', l.title, 'category', l.category, 'brand', l.brand,
          'condition', l.condition, 'price', l.price, 'status', l.status,
          'views', l.views, 'city', l.city, 'images', to_jsonb(l.images),
          'createdAt', l.created_at,
          'sellerName', s.name, 'sellerPhone', s.phone
        ) AS x
        FROM public.bss_listings l JOIN public.bss_sellers s ON s.phone = l.seller_phone
      ) q
    ),
    'deals', (
      SELECT coalesce(jsonb_agg(q.x ORDER BY q.x->>'createdAt' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'id', o.id, 'status', o.status, 'offerPrice', o.offer_price,
          'message', o.message, 'createdAt', o.created_at,
          'buyerName', o.buyer_name, 'buyerPhone', o.buyer_phone, 'buyerCity', o.buyer_city,
          'listingId', l.id, 'listingTitle', l.title, 'listingPrice', l.price,
          'sellerName', s.name, 'sellerPhone', s.phone
        ) AS x
        FROM public.bss_listing_orders o
        JOIN public.bss_listings l ON l.id = o.listing_id
        JOIN public.bss_sellers  s ON s.phone = l.seller_phone
      ) q
    ),
    'orders', (
      SELECT coalesce(jsonb_agg(row_to_json(o) ORDER BY o.created_at DESC), '[]'::jsonb)
      FROM public.bss_orders o
    ),
    'sellRequests', (
      SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.bss_sell_requests r
    ),
    'repairRequests', (
      SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.bss_repair_requests r
    ),
    'messages', (
      SELECT coalesce(jsonb_agg(row_to_json(m) ORDER BY m.created_at DESC), '[]'::jsonb)
      FROM public.bss_contact_messages m
    )
  ) INTO v_out;

  RETURN v_out;
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 6. Admin mutations
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_admin_set_listing_status(
  p_username text, p_password text, p_id text, p_status text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  PERFORM public.bss_admin_assert(p_username, p_password);
  IF p_status NOT IN ('active', 'reserved', 'sold', 'removed') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  UPDATE public.bss_listings SET status = p_status WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id', p_id, 'status', p_status);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.bss_admin_delete_listing(
  p_username text, p_password text, p_id text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  PERFORM public.bss_admin_assert(p_username, p_password);
  DELETE FROM public.bss_listings WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id', p_id, 'deleted', true);
END;
$fn$;

-- kind: deal | order | sell | repair
CREATE OR REPLACE FUNCTION public.bss_admin_set_request_status(
  p_username text, p_password text, p_kind text, p_id text, p_status integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  PERFORM public.bss_admin_assert(p_username, p_password);

  IF p_kind = 'deal' THEN
    UPDATE public.bss_listing_orders SET status = p_status WHERE id = p_id;
  ELSIF p_kind = 'order' THEN
    UPDATE public.bss_orders SET status = p_status WHERE id = p_id;
  ELSIF p_kind = 'sell' THEN
    UPDATE public.bss_sell_requests SET status = p_status WHERE id = p_id;
  ELSIF p_kind = 'repair' THEN
    UPDATE public.bss_repair_requests SET status = p_status WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'INVALID_KIND';
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id', p_id, 'kind', p_kind, 'status', p_status);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.bss_admin_invoice(
  p_username text, p_password text, p_id text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  PERFORM public.bss_admin_assert(p_username, p_password);
  RETURN public.bss_invoice(p_id, NULL, true);
END;
$fn$;

-- -----------------------------------------------------------------------------
-- Only the service role may call these; the anon key must not.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.bss_admin_auth(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_assert(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_overview(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_set_listing_status(text, text, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_delete_listing(text, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_set_request_status(text, text, text, text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_admin_invoice(text, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bss_invoice(text, text, boolean) FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Admin account management (used for seeding the first super admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bss_admin_upsert(
  p_username text, p_password text, p_name text, p_role text DEFAULT 'admin'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  INSERT INTO public.bss_admins (username, pass_hash, name, role)
  VALUES (lower(trim(p_username)), crypt(p_password, gen_salt('bf', 8)), p_name, p_role)
  ON CONFLICT (username) DO UPDATE
    SET pass_hash = crypt(p_password, gen_salt('bf', 8)),
        name = excluded.name,
        role = excluded.role;

  RETURN jsonb_build_object('username', lower(trim(p_username)), 'role', p_role);
END;
$fn$;

REVOKE ALL ON FUNCTION public.bss_admin_upsert(text, text, text, text) FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. Demo accounts
--
-- Change these before going anywhere near production.
-- -----------------------------------------------------------------------------
SELECT public.bss_admin_upsert('superadmin', 'Bheral@2026', 'Super Admin', 'superadmin');
SELECT public.bss_buyer_auth('9000000002', '2468', 'Test Buyer', 'test.buyer@bheral.test', 'Noida');

-- PostgREST caches the function signatures; without this the API keeps
-- answering "Could not find the function ... in the schema cache".
NOTIFY pgrst, 'reload schema';
