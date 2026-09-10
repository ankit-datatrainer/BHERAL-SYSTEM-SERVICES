'use client';

/**
 * Drives the motion engine across client-side navigation.
 *
 * `bootMotion` runs once; `refreshMotion` re-tags the DOM after each route
 * change so newly rendered sections reveal on scroll just like the first page.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { bootMotion, refreshMotion } from '@/lib/motion';

export function MotionLayer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    bootMotion();
  }, []);

  useEffect(() => {
    // Wait a frame so React has committed the new tree before we tag it.
    const raf = requestAnimationFrame(() => refreshMotion());
    return () => cancelAnimationFrame(raf);
  }, [pathname, searchParams]);

  return null;
}
