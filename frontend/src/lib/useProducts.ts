'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

/**
 * Resolves a list of product IDs into a dictionary of full Product objects.
 * Runs queries in parallel and caches in state per unique ID set.
 */
export function useProducts(ids: string[]) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const key = ids.slice().sort().join(',');

  useEffect(() => {
    if (!key) {
      setProducts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      key.split(',').map((id) =>
        api
          .product(id)
          .then((r) => r.product)
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, Product> = {};
        for (const p of results) if (p) map[p.id] = p;
        setProducts(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { products, loading };
}
