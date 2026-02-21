"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";

const STORAGE_KEY = "luxury-market-cart-v1";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  universe: Product["universe"];
  category: string;
  quantity: number;
};

type CartProductInput = Pick<
  Product,
  "id" | "slug" | "name" | "price" | "image" | "universe" | "category"
>;

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (product: CartProductInput, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Omit<CartItem, "quantity"> & { quantity: unknown } =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.slug === "string" &&
          typeof item.name === "string" &&
          typeof item.price === "number" &&
          typeof item.image === "string" &&
          (item.universe === "mode" || item.universe === "tout") &&
          typeof item.category === "string" &&
          "quantity" in item
      )
      .map((item) => ({
        ...item,
        quantity: clampQuantity(Number(item.quantity)),
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: CartProductInput, quantity = 1) => {
    const qty = clampQuantity(quantity);
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) {
        return [...current, { ...product, quantity: qty }];
      }
      return current.map((item) =>
        item.id === product.id
          ? { ...item, quantity: clampQuantity(item.quantity + qty) }
          : item
      );
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.id !== productId));
      return;
    }
    const qty = clampQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity: qty } : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      hydrated,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
