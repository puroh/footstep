import { atom, computed } from "nanostores";

export interface CartItemTopping {
  topping_id: string;
  name: string;
  extra_price: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  photo_url: string;
  base_price: number;
  toppings: CartItemTopping[];
  notes: string;
}

export const $cartItems = atom<CartItem[]>([]);

export const $cartItemCount = computed($cartItems, (items) => items.length);

export const $cartSubtotal = computed($cartItems, (items) =>
  items.reduce((sum, item) => {
    const toppingsTotal = item.toppings.reduce(
      (t, topping) => t + topping.extra_price,
      0
    );
    return sum + item.base_price + toppingsTotal;
  }, 0)
);

export function addToCart(item: Omit<CartItem, "id">): void {
  const id = crypto.randomUUID();
  $cartItems.set([...$cartItems.get(), { ...item, id }]);
}

export function removeFromCart(id: string): void {
  $cartItems.set($cartItems.get().filter((item) => item.id !== id));
}

export function clearCart(): void {
  $cartItems.set([]);
}
