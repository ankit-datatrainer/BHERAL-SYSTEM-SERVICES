'use client';

/**
 * Cart, wishlist and toast state for the whole storefront.
 *
 * Cart and wishlist live in localStorage (per browser, like the original
 * site) and hold only product ids + quantities. Prices are always resolved
 * from the API so a stale cart can never carry a stale price to checkout.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS, readJSON, writeJSON } from '@/lib/storage';

export interface CartLine {
  id: string;
  qty: number;
}

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface StoreValue {
  cart: CartLine[];
  wishlist: string[];
  /** False until localStorage has been read, so SSR and first paint agree. */
  hydrated: boolean;
  cartCount: number;
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  isWished: (id: string) => boolean;
  toast: (message: string, kind?: ToastKind) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const MAX_QTY = 10;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Hydrate after mount: reading localStorage during render would desync SSR.
  useEffect(() => {
    setCart(readJSON<CartLine[]>(STORAGE_KEYS.cart, []));
    setWishlist(readJSON<string[]>(STORAGE_KEYS.wishlist, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.cart, cart);
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.wishlist, wishlist);
  }, [wishlist, hydrated]);

  const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);
  const toggleCartDrawer = useCallback(() => setCartDrawerOpen((prev) => !prev), []);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = (toastId.current += 1);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const addToCart = useCallback(
    (id: string, qty = 1) => {
      setCart((prev) => {
        const existing = prev.find((line) => line.id === id);
        if (existing) {
          return prev.map((line) =>
            line.id === id ? { ...line, qty: Math.min(MAX_QTY, line.qty + qty) } : line,
          );
        }
        return [...prev, { id, qty: Math.min(MAX_QTY, qty) }];
      });
      // Automatically show the right-side cart drawer instead of toast
      setCartDrawerOpen(true);
    },
    [],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((line) => line.id !== id)
        : prev.map((line) => (line.id === id ? { ...line, qty: Math.min(MAX_QTY, qty) } : line)),
    );
  }, []);

  const removeFromCart = useCallback(
    (id: string) => {
      setCart((prev) => prev.filter((line) => line.id !== id));
      toast('Removed from cart', 'info');
    },
    [toast],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (id: string) => {
      setWishlist((prev) => {
        if (prev.includes(id)) {
          toast('Removed from wishlist', 'info');
          return prev.filter((w) => w !== id);
        }
        toast('Saved to wishlist!', 'success');
        return [...prev, id];
      });
    },
    [toast],
  );

  const isWished = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const value = useMemo<StoreValue>(
    () => ({
      cart,
      wishlist,
      hydrated,
      cartCount: cart.reduce((sum, line) => sum + line.qty, 0),
      cartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      toggleCartDrawer,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWished,
      toast,
    }),
    [
      cart,
      wishlist,
      hydrated,
      cartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      toggleCartDrawer,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWished,
      toast,
    ],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="status">
            <span className="icon">
              {t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
