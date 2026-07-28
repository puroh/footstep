/**
 * FilterBar — toggles for filtering orders by status and delivery type.
 * Persists preferences to localStorage.
 */

import { useEffect } from "react";
import {
  DELIVERY_LABELS,
  STATUS_LABELS,
  type DeliveryType,
  type OrderStatus,
} from "@/lib/kitchen";

export interface FilterState {
  statuses: OrderStatus[];
  deliveryTypes: DeliveryType[];
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  slug: string;
}

const ALL_STATUSES: OrderStatus[] = [
  "received",
  "confirmed",
  "in_preparation",
  "completed",
  "cancelled",
];

const ALL_DELIVERY_TYPES: DeliveryType[] = ["delivery", "pickup", "dine_in"];

const STORAGE_KEY_PREFIX = "kitchen_filters_";

export function getDefaultFilters(): FilterState {
  return {
    statuses: ["received", "confirmed", "in_preparation"],
    deliveryTypes: [...ALL_DELIVERY_TYPES],
  };
}

export function loadFilters(slug: string): FilterState {
  if (typeof window === "undefined") return getDefaultFilters();
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return getDefaultFilters();
}

export function saveFilters(slug: string, filters: FilterState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, JSON.stringify(filters));
}

export function applyFilters(
  orders: import("@/lib/kitchen").KitchenOrder[],
  filters: FilterState
): import("@/lib/kitchen").KitchenOrder[] {
  return orders.filter(
    (order) =>
      filters.statuses.includes(order.status) &&
      filters.deliveryTypes.includes(order.delivery_type)
  );
}

export function FilterBar({ filters, onChange, slug }: FilterBarProps) {
  // Persist filters on change
  useEffect(() => {
    saveFilters(slug, filters);
  }, [filters, slug]);

  function toggleStatus(status: OrderStatus) {
    const current = filters.statuses;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...filters, statuses: updated });
  }

  function toggleDeliveryType(dt: DeliveryType) {
    const current = filters.deliveryTypes;
    const updated = current.includes(dt)
      ? current.filter((d) => d !== dt)
      : [...current, dt];
    onChange({ ...filters, deliveryTypes: updated });
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar__section">
        <span className="filter-bar__label">Estado:</span>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            className={`filter-bar__btn ${
              filters.statuses.includes(status) ? "filter-bar__btn--active" : ""
            }`}
            onClick={() => toggleStatus(status)}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <div className="filter-bar__section">
        <span className="filter-bar__label">Entrega:</span>
        {ALL_DELIVERY_TYPES.map((dt) => (
          <button
            key={dt}
            className={`filter-bar__btn ${
              filters.deliveryTypes.includes(dt) ? "filter-bar__btn--active" : ""
            }`}
            onClick={() => toggleDeliveryType(dt)}
          >
            {DELIVERY_LABELS[dt]}
          </button>
        ))}
      </div>
    </div>
  );
}
