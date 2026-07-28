import type { CartItem } from "@/stores/cart";

export interface OrderTotal {
  subtotal: number;
  delivery_fee: number;
  total: number;
}

export function computeOrderTotal(
  items: CartItem[],
  deliveryFee: number,
  deliveryType: string
): OrderTotal {
  const subtotal = items.reduce((sum, item) => {
    const toppingsPrice = item.toppings.reduce(
      (t, topping) => t + topping.extra_price,
      0
    );
    return sum + item.base_price + toppingsPrice;
  }, 0);

  const fee = deliveryType === "delivery" ? deliveryFee : 0;

  return {
    subtotal,
    delivery_fee: fee,
    total: subtotal + fee,
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}
