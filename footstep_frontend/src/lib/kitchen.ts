/**
 * Kitchen panel utility functions.
 * Status colors, state machine, elapsed time, sorting.
 */

export type OrderStatus =
  | "received"
  | "confirmed"
  | "in_preparation"
  | "completed"
  | "cancelled";

export type DeliveryType = "delivery" | "pickup" | "dine_in";

export interface KitchenOrderTopping {
  name: string;
  extra_price: number;
}

export interface KitchenOrderItem {
  product_name: string;
  unit_price: number;
  notes: string;
  toppings: KitchenOrderTopping[];
}

export interface KitchenOrder {
  id: string;
  reference_number: string;
  status: OrderStatus;
  delivery_type: DeliveryType;
  address_line: string;
  customer_phone: string;
  payment_method_type: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  items: KitchenOrderItem[];
  created_at: string;
}

// --- Status colors ---

export const STATUS_COLORS: Record<OrderStatus, string> = {
  received: "#3b82f6",       // blue
  confirmed: "#f59e0b",      // amber
  in_preparation: "#8b5cf6", // purple
  completed: "#10b981",      // green
  cancelled: "#ef4444",      // red
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibido",
  confirmed: "Confirmado",
  in_preparation: "En preparación",
  completed: "Completado",
  cancelled: "Cancelado",
};

// --- State machine ---

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ["confirmed", "cancelled"],
  confirmed: ["in_preparation", "cancelled"],
  in_preparation: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const transitions = VALID_TRANSITIONS[current];
  // Return the first non-cancel transition (the "advance" action)
  return transitions.find((s) => s !== "cancelled") ?? null;
}

export function isCancellable(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].includes("cancelled");
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}

// --- Elapsed time ---

export function getElapsedMinutes(createdAt: string, now: Date = new Date()): number {
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}

// --- Sorting ---

export function sortByArrivalTime(orders: KitchenOrder[]): KitchenOrder[] {
  return [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// --- Delivery labels ---

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  delivery: "Domicilio",
  pickup: "Recoger",
  dine_in: "En el local",
};

// --- Payment labels ---

export function getPaymentLabel(type: string | null): string {
  if (!type) return "Sin definir";
  const labels: Record<string, string> = {
    cash: "Efectivo",
    transfer: "Transferencia",
    transfer_with_key: "Transferencia (Bre-b)",
  };
  return labels[type] ?? type;
}
