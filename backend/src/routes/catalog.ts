/**
 * Catalogue endpoints: products, repair services, and global search.
 *
 * Filtering, sorting and pagination all happen here rather than in the
 * browser, so the buy page no longer has to download all 18 products (and
 * would not have to download 18,000).
 */
import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { asyncRoute, HttpError } from '../middleware/errors.js';
import type { Product, RepairService } from '../types.js';

export const catalogRouter = Router();

/** Postgres snake_case row -> camelCase domain object. */
function toProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    image: row.image,
    images: row.images ?? [],
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    discount: row.discount ?? undefined,
    processor: row.processor ?? '',
    ram: row.ram ?? 0,
    storage: row.storage ?? 0,
    storageType: row.storage_type ?? '',
    gpu: row.gpu ?? '',
    screenSize: row.screen_size ? Number(row.screen_size) : 0,
    operatingSystem: row.operating_system ?? '',
    condition: row.condition ?? '',
    rating: row.rating ? Number(row.rating) : 0,
    reviewCount: row.review_count ?? 0,
    stock: row.stock ?? 0,
    warranty: row.warranty ?? '',
    isNew: row.is_new ?? false,
    featured: row.featured ?? false,
    description: row.description ?? '',
    specifications: row.specifications ?? {},
  };
}

function toRepairService(row: Record<string, any>): RepairService {
  return {
    id: row.id,
    name: row.name,
    device: row.device,
    icon: row.icon ?? 'build',
    description: row.description ?? '',
    time: row.time ?? '',
    popular: row.popular ?? false,
  };
}

/** Comma-separated query params -> string[] (`?brand=Dell,HP`). */
const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

const csvNumbers = z
  .string()
  .optional()
  .transform((v) =>
    v ? v.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)) : [],
  );

const productQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: csv,
  brand: csv,
  processor: csv,
  storageType: csv,
  os: csv,
  condition: csv,
  gpu: csv,
  ram: csvNumbers,
  storage: csvNumbers,
  screenSize: csvNumbers,
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  inStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['recommended', 'low', 'high', 'rating', 'discount', 'newest']).default('recommended'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
});

/**
 * GET /api/products
 * Filter/sort/paginate the catalogue. Also returns the facet values the
 * sidebar needs so the UI never has to hard-code brand or OS lists.
 */
catalogRouter.get(
  '/products',
  asyncRoute(async (req, res) => {
    const params = productQuerySchema.parse(req.query);

    const { data, error } = await supabase.from('bss_products').select('*');
    if (error) throw new HttpError(502, `Failed to load products: ${error.message}`);

    let items = (data ?? []).map(toProduct);

    // Facets are derived from the unfiltered set so options never disappear
    // as the customer narrows things down.
    const facets = {
      categories: [...new Set(items.map((p) => p.category))].sort(),
      brands: [...new Set(items.map((p) => p.brand))].sort(),
      storageTypes: [...new Set(items.map((p) => p.storageType).filter(Boolean))].sort(),
      operatingSystems: [...new Set(items.map((p) => p.operatingSystem).filter(Boolean))].sort(),
      conditions: [...new Set(items.map((p) => p.condition).filter(Boolean))].sort(),
      ram: [...new Set(items.map((p) => p.ram).filter(Boolean))].sort((a, b) => a - b),
      storage: [...new Set(items.map((p) => p.storage).filter(Boolean))].sort((a, b) => a - b),
      screenSizes: [...new Set(items.map((p) => p.screenSize).filter(Boolean))].sort((a, b) => a - b),
      priceRange: {
        min: items.length ? Math.min(...items.map((p) => p.price)) : 0,
        max: items.length ? Math.max(...items.map((p) => p.price)) : 0,
      },
    };

    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter((p) =>
        `${p.name} ${p.brand} ${p.category} ${p.processor} ${p.description}`.toLowerCase().includes(q),
      );
    }

    if (params.category.length) items = items.filter((p) => params.category.includes(p.category));
    if (params.brand.length) items = items.filter((p) => params.brand.includes(p.brand));
    if (params.processor.length) {
      items = items.filter((p) => params.processor.some((proc) => p.processor.includes(proc)));
    }
    if (params.ram.length) items = items.filter((p) => params.ram.includes(p.ram));
    if (params.storage.length) items = items.filter((p) => params.storage.includes(p.storage));
    if (params.storageType.length) items = items.filter((p) => params.storageType.includes(p.storageType));
    if (params.screenSize.length) items = items.filter((p) => params.screenSize.includes(p.screenSize));
    if (params.os.length) items = items.filter((p) => params.os.includes(p.operatingSystem));
    if (params.condition.length) items = items.filter((p) => params.condition.includes(p.condition));

    if (params.gpu.length) {
      const dedicated = /NVIDIA|Quadro|GTX|RTX|Radeon/i;
      items = items.filter((p) => {
        const isDedicated = dedicated.test(p.gpu);
        if (params.gpu.includes('Dedicated') && params.gpu.includes('Integrated')) return true;
        if (params.gpu.includes('Dedicated')) return isDedicated;
        if (params.gpu.includes('Integrated')) return !isDedicated;
        return true;
      });
    }

    if (params.minRating !== undefined) items = items.filter((p) => p.rating >= params.minRating!);
    if (params.minPrice !== undefined) items = items.filter((p) => p.price >= params.minPrice!);
    if (params.maxPrice !== undefined) items = items.filter((p) => p.price <= params.maxPrice!);
    if (params.inStock) items = items.filter((p) => p.stock > 0);
    if (params.featured) items = items.filter((p) => p.featured);

    items.sort((a, b) => {
      switch (params.sort) {
        case 'low':
          return a.price - b.price;
        case 'high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'discount':
          return (b.discount ?? 0) - (a.discount ?? 0);
        case 'newest':
          return Number(b.isNew) - Number(a.isNew);
        default:
          // "Recommended" surfaces featured stock first, then best rated.
          return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
      }
    });

    const total = items.length;
    const start = (params.page - 1) * params.pageSize;

    res.json({
      items: items.slice(start, start + params.pageSize),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      facets,
    });
  }),
);

/** GET /api/products/:id — full detail for the product page. */
catalogRouter.get(
  '/products/:id',
  asyncRoute(async (req, res) => {
    const { data, error } = await supabase
      .from('bss_products')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw new HttpError(502, `Failed to load product: ${error.message}`);
    if (!data) throw new HttpError(404, `No product with id "${req.params.id}"`);

    const product = toProduct(data);

    // Same-category alternatives for the "related" rail.
    const { data: relatedRows } = await supabase
      .from('bss_products')
      .select('*')
      .eq('category', product.category)
      .neq('id', product.id)
      .limit(4);

    res.json({ product, related: (relatedRows ?? []).map(toProduct) });
  }),
);

/** GET /api/repair-services — optionally filtered by device. */
catalogRouter.get(
  '/repair-services',
  asyncRoute(async (req, res) => {
    const device = typeof req.query.device === 'string' ? req.query.device : undefined;

    let query = supabase.from('bss_repair_services').select('*');
    if (device && device !== 'All') query = query.eq('device', device);

    const { data, error } = await query;
    if (error) throw new HttpError(502, `Failed to load repair services: ${error.message}`);

    const items = (data ?? []).map(toRepairService);

    const { data: allRows } = await supabase.from('bss_repair_services').select('device');
    const devices = [...new Set((allRows ?? []).map((r: any) => r.device))].sort();

    res.json({ items, total: items.length, devices });
  }),
);

/**
 * GET /api/search?q=&scope=
 * Powers the header autocomplete across products and repair services.
 */
catalogRouter.get(
  '/search',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const scope = String(req.query.scope ?? 'all');
    const limit = Math.min(Number(req.query.limit ?? 8) || 8, 20);

    if (!q) {
      res.json({ results: [] });
      return;
    }

    const [{ data: productRows }, { data: serviceRows }] = await Promise.all([
      supabase.from('bss_products').select('*'),
      supabase.from('bss_repair_services').select('*'),
    ]);

    type Hit = {
      id: string;
      name: string;
      category: string;
      description: string;
      image?: string;
      icon?: string;
      price?: number;
      href: string;
      isService: boolean;
    };

    let corpus: Hit[] = [];

    if (scope !== 'Repair') {
      corpus.push(
        ...(productRows ?? []).map(toProduct).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          image: p.image,
          price: p.price,
          href: `/product/${p.id}`,
          isService: false,
        })),
      );
    }

    if (scope === 'all' || scope === 'Repair') {
      corpus.push(
        ...(serviceRows ?? []).map(toRepairService).map((s) => ({
          id: s.id,
          name: s.name,
          category: 'Repair Service',
          description: s.description,
          icon: s.icon,
          href: `/repair?service=${encodeURIComponent(s.name)}`,
          isService: true,
        })),
      );
    }

    // Scope narrowing mirrors the old header dropdown.
    if (scope === 'Laptop' || scope === 'Desktop') {
      corpus = corpus.filter((item) => !item.isService && item.category === scope);
    } else if (scope === 'Parts') {
      corpus = corpus.filter((item) => !item.isService && !['Laptop', 'Desktop'].includes(item.category));
    }

    const results = corpus
      .filter((item) => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(q))
      // Prefix matches on the name are the most likely intent, so rank them first.
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    res.json({ results });
  }),
);
