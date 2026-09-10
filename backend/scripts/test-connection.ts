import { supabase, pingDatabase } from '../src/supabase.js';
import { env } from '../src/env.js';

async function testSupabase() {
  console.log('=== Supabase Connection Test ===');
  console.log(`URL: ${env.SUPABASE_URL}`);
  console.log(`Key type in use: ${env.usingServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)' : 'SUPABASE_ANON_KEY'}`);

  const start = Date.now();

  // 1. Basic reachability check via REST
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: env.supabaseKey,
        Authorization: `Bearer ${env.supabaseKey}`,
      },
    });
    const duration = Date.now() - start;
    console.log(`REST endpoint ping: Status ${res.status} ${res.statusText} (${duration}ms)`);
    if (res.ok) {
      console.log('✓ Supabase REST endpoint is reachable and authenticated successfully.');
    } else {
      const errText = await res.text();
      console.error(`✗ Supabase REST endpoint returned error:`, errText);
    }
  } catch (err: any) {
    console.error('✗ Failed to reach Supabase REST endpoint:', err.message);
  }

  // 2. Test pingDatabase() from src/supabase.ts
  console.log('\n--- Testing pingDatabase() ---');
  const ping = await pingDatabase();
  if (ping.ok) {
    console.log('✓ pingDatabase() succeeded: bss_products is accessible.');
  } else {
    console.log(`! pingDatabase() result: ok=${ping.ok}, error=${ping.error}`);
  }

  // 3. Inspect status of all known tables
  const tables = [
    'bss_products',
    'bss_repair_services',
    'bss_valuation_config',
    'bss_orders',
    'bss_sell_requests',
    'bss_repair_requests',
    'bss_contact_messages',
    'bss_sellers',
    'bss_listings',
    'bss_listing_orders',
  ];

  console.log('\n--- Checking Tables (Actual SELECT Query) ---');
  for (const table of tables) {
    const res = await supabase.from(table).select('*').limit(1);
    if (res.error) {
      console.log(`✗ Table [${table}]: ${res.error.message} (code: ${res.error.code}, status: ${res.status})`);
    } else {
      console.log(`✓ Table [${table}]: Exists and accessible (returned ${res.data?.length ?? 0} rows, status: ${res.status})`);
    }
  }

  // Also query OpenAPI definition from PostgREST to list all registered tables
  console.log('\n--- Querying OpenAPI Schema for Existing Tables ---');
  try {
    const schemaRes = await fetch(`${env.SUPABASE_URL}/rest/v1/?apikey=${env.supabaseKey}`, {
      headers: {
        Authorization: `Bearer ${env.supabaseKey}`,
      },
    });
    if (schemaRes.ok) {
      const openApi = (await schemaRes.json()) as any;
      const paths = Object.keys(openApi.paths || {}).map(p => p.replace('/', ''));
      console.log('Tables exposed in Supabase schema cache:', paths.length > 0 ? paths : '(none)');
    }
  } catch (e: any) {
    console.log('Failed to fetch OpenAPI definition:', e.message);
  }

  // 4. Test RPC functions existence
  console.log('\n--- Checking Stored Procedures (RPC) ---');
  const rpcTests = [
    { name: 'bss_track_request', params: { p_id: 'TEST', p_phone: '0000000000' } },
    { name: 'bss_seller_auth', params: { p_phone: '0000000000', p_pin: '0000' } },
  ];

  for (const { name, params } of rpcTests) {
    const { data, error } = await supabase.rpc(name, params);
    if (error) {
      if (error.message.includes('Could not find the function') || error.code === 'PGRST202') {
        console.log(`✗ RPC [${name}]: Function does not exist in database`);
      } else {
        console.log(`✓ RPC [${name}]: Function exists (returned expected response / domain error: ${error.message})`);
      }
    } else {
      console.log(`✓ RPC [${name}]: Function exists (returned: ${JSON.stringify(data)})`);
    }
  }

  console.log('\n=== Test Completed ===');
}

testSupabase().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
