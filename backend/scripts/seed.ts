/**
 * Seeds the Supabase catalogue from src/data/catalog.ts.
 * Idempotent: re-running upserts the same rows, so it is safe in CI.
 *
 *   npm run seed
 */
import { supabase } from '../src/supabase.js';
import { products, repairServices, valuationConfig } from '../src/data/catalog.js';

async function main(): Promise<void> {
  console.log(`Seeding ${products.length} products...`);
  const { error: productError } = await supabase.from('bss_products').upsert(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      image: p.image,
      images: p.images ?? [],
      price: p.price,
      original_price: p.originalPrice ?? null,
      discount: p.discount ?? null,
      processor: p.processor ?? null,
      ram: p.ram ?? null,
      storage: p.storage ?? null,
      storage_type: p.storageType ?? null,
      gpu: p.gpu ?? null,
      screen_size: p.screenSize ?? null,
      operating_system: p.operatingSystem ?? null,
      condition: p.condition ?? null,
      rating: p.rating ?? null,
      review_count: p.reviewCount ?? 0,
      stock: p.stock ?? 0,
      warranty: p.warranty ?? null,
      is_new: p.isNew ?? false,
      featured: p.featured ?? false,
      description: p.description ?? null,
      specifications: p.specifications ?? {},
    })),
    { onConflict: 'id' },
  );
  if (productError) throw new Error(`products: ${productError.message}`);

  console.log(`Seeding ${repairServices.length} repair services...`);
  const { error: repairError } = await supabase
    .from('bss_repair_services')
    .upsert(repairServices, { onConflict: 'id' });
  if (repairError) throw new Error(`repair services: ${repairError.message}`);

  console.log('Seeding valuation config...');
  const { error: configError } = await supabase
    .from('bss_valuation_config')
    .upsert({ key: 'default', value: valuationConfig, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (configError) throw new Error(`valuation config: ${configError.message}`);

  const [{ count: productCount }, { count: repairCount }] = await Promise.all([
    supabase.from('bss_products').select('id', { count: 'exact', head: true }),
    supabase.from('bss_repair_services').select('id', { count: 'exact', head: true }),
  ]);

  console.log(`\nDone. Database now holds ${productCount} products and ${repairCount} repair services.`);
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
