'use client';

/**
 * Re-runs DOM tagging when a client-rendered list settles (catalogue results,
 * wizard steps). Render it after the content it should pick up.
 */
import { useEffect } from 'react';
import { refreshMotion } from '@/lib/motion';

export function Reveal({ deps = [] }: { deps?: unknown[] }) {
  useEffect(() => {
    const raf = requestAnimationFrame(() => refreshMotion());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return null;
}
