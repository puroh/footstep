/**
 * KitchenPanel — main React island for the kitchen real-time view.
 * Manages orders state, WebSocket connection, filters, and rendering.
 */

import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  sortByArrivalTime,
  type KitchenOrder,
  type OrderStatus,
} from "@/lib/kitchen";
import { apiPatch } from "@/lib/api";
import { OrderCard } from "./OrderCard";
import {
  FilterBar,
  applyFilters,
  loadFilters,
  type FilterState,
} from "./FilterBar";

interface KitchenPanelProps {
  slug: string;
  token: string;
  initialOrders: KitchenOrder[];
  wsUrl: string;
}

export function KitchenPanel({
  slug,
  token: initialToken,
  initialOrders,
  wsUrl,
}: KitchenPanelProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [filters, setFilters] = useState<FilterState>(() => loadFilters(slug));
  const [token, setToken] = useState(initialToken);

  // Listen for initialization event from the Astro page script
  useEffect(() => {
    function handleInit(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.orders) {
        setOrders(detail.orders);
      }
      if (detail.token) {
        setToken(detail.token);
      }
    }
    window.addEventListener("kitchen:init", handleInit);
    return () => window.removeEventListener("kitchen:init", handleInit);
  }, []);

  // If no token provided via props, try localStorage
  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      const stored = localStorage.getItem("footstep_access_token");
      if (stored) setToken(stored);
    }
  }, [token]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data: unknown) => {
    const message = data as { type: string; order: KitchenOrder };

    if (message.type === "new_order") {
      setOrders((prev) => [...prev, message.order]);
    } else if (message.type === "order_status_changed") {
      setOrders((prev) =>
        prev.map((o) => (o.id === message.order.id ? message.order : o))
      );
    }
  }, []);

  const { isConnected } = useWebSocket({
    url: wsUrl,
    token,
    onMessage: handleMessage,
    enabled: !!token,
  });

  // --- Actions ---

  async function handleAdvance(orderId: string, newStatus: OrderStatus) {
    const res = await apiPatch(`/orders/${orderId}/status/`, {
      status: newStatus,
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: updated.status } : o
        )
      );
    }
  }

  async function handleCancel(orderId: string) {
    const res = await apiPatch(`/orders/${orderId}/status/`, {
      status: "cancelled",
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "cancelled" as OrderStatus } : o
        )
      );
    }
  }

  // --- Render ---

  const filtered = applyFilters(orders, filters);
  const sorted = sortByArrivalTime(filtered);

  return (
    <div className="kitchen-panel">
      {/* Connection status */}
      {!isConnected && token && (
        <div className="kitchen-panel__disconnected">
          Conexión perdida. Reintentando...
        </div>
      )}

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} slug={slug} />

      {/* Orders grid */}
      <div className="kitchen-panel__grid">
        {sorted.length === 0 && (
          <p className="kitchen-panel__empty">
            No hay pedidos con los filtros seleccionados.
          </p>
        )}
        {sorted.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onAdvance={handleAdvance}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </div>
  );
}
