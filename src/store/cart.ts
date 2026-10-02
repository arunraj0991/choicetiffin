import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCart } from "@/src/api/api";

export type CartItem = {
  id?: string | number;
  item_id?: string | number;
  qty?: string | number;
  [key: string]: any;
};

type CartState = {
  cartNo: string | null;
  cartData: any | null;
  items: CartItem[];
  qtyMap: Record<string, number>;
  itemCount: number;
  setCartFromResponse: (res: any, cartNo?: string | null) => void;
  updateItemQty: (id: string, qty: number) => void;
  ensureCartNo: (existingNo?: string | null) => Promise<string>;
  fetchCart: (existingNo?: string | null) => Promise<string>;
  clearCart: () => void;
};

function extractItems(res: any): CartItem[] {
  const items = res?.data?.cart ?? res?.cart ?? [];
  return Array.isArray(items) ? items : [];
}

function qtyMapFromItems(items: CartItem[]) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const itemId = String(item?.item_id ?? item?.id ?? "");
    const qty = Number(item?.qty ?? 0);
    if (itemId && qty > 0) map[itemId] = qty;
  });
  return map;
}

function countFromItems(items: CartItem[]) {
  return items.reduce((sum, item) => {
    const qty = Number(item?.qty ?? 0);
    return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);
}

async function resolveCartNo(existing?: string | null) {
  if (existing) return existing;
  const stored = await AsyncStorage.getItem("cart_no");
  if (stored) return stored;
  const newNo =
    Date.now().toString() + Math.random().toString(36).slice(2, 6);
  await AsyncStorage.setItem("cart_no", newNo);
  return newNo;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartNo: null,
  cartData: null,
  items: [],
  qtyMap: {},
  itemCount: 0,

  setCartFromResponse: (res, cartNo) => {
    const items = extractItems(res);
    set({
      ...(cartNo != null ? { cartNo } : {}),
      cartData: res?.data ?? res ?? null,
      items,
      qtyMap: qtyMapFromItems(items),
      itemCount: countFromItems(items),
    });
  },

  updateItemQty: (id, qty) => {
    set((state) => {
      const qtyMap = { ...state.qtyMap };
      if (qty <= 0) delete qtyMap[id];
      else qtyMap[id] = qty;
      const itemCount = Object.values(qtyMap).reduce((sum, n) => sum + n, 0);
      return { qtyMap, itemCount };
    });
  },

  ensureCartNo: async (existingNo) => {
    const no = await resolveCartNo(existingNo || get().cartNo);
    set({ cartNo: no });
    return no;
  },

  fetchCart: async (existingNo) => {
    const no = await get().ensureCartNo(existingNo);
    try {
      const res = await getCart(no);
      get().setCartFromResponse(res, no);
    } catch {}
    return no;
  },

  clearCart: () =>
    set({
      cartNo: null,
      cartData: null,
      items: [],
      qtyMap: {},
      itemCount: 0,
    }),
}));

export async function getPostLoginHref() {
  const cartNo = await useCartStore.getState().fetchCart();
  if (useCartStore.getState().itemCount > 0) {
    return `/cart?cartNo=${encodeURIComponent(cartNo)}`;
  }
  return "/(tabs)";
}
