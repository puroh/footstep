/**
 * OrderCard — displays a single order in the kitchen panel.
 * Color-coded by status, with advance/cancel action buttons.
 */

import { useEffect, useState } from "react";
import {
  DELIVERY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatElapsed,
  getElapsedMinutes,
  getNextStatus,
  getPaymentLabel,
  isCancellable,
  isTerminal,
  type KitchenOrder,
  type OrderStatus,
} from "@/lib/kitchen";

interface OrderCardProps {
  order: KitchenOrder;
  onAdvance: (orderId: string, newStatus: OrderStatus) => void;
  onCancel: (orderId: string) => void;
}

export function OrderCard({ order, onAdvance, onCancel }: OrderCardProps) {
  const [elapsed, setElapsed] = useState(() =>
    getElapsedMinutes(order.created_at)
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Update elapsed time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsedMinutes(order.created_at));
    }, 60000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const nextStatus = getNextStatus(order.status);
  const canCancel = isCancellable(order.status);
  const terminal = isTerminal(order.status);
  const statusColor = STATUS_COLORS[order.status];

  return (
    <div
      style={{
        borderLeft: `4px solid ${statusColor}`,
        background: `${statusColor}10`,
      }}
      className="order-card"
    >
      {/* Header */}
      <div className="order-card__header">
        <span className="order-card__ref">#{order.reference_number}</span>
        <span
          className="order-card__status"
          style={{ background: statusColor, color: "#fff" }}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Timer */}
      <div className="order-card__time">
        {formatElapsed(elapsed)}
      </div>

      {/* Items */}
      <ul className="order-card__items">
        {order.items.map((item, idx) => (
          <li key={idx}>
            <strong>{item.product_name}</strong> — ${item.unit_price.toLocaleString()}
            {item.toppings.length > 0 && (
              <ul className="order-card__toppings">
                {item.toppings.map((t, tidx) => (
                  <li key={tidx}>
                    + {t.name} (${t.extra_price.toLocaleString()})
                  </li>
                ))}
              </ul>
            )}
            {item.notes && (
              <p className="order-card__notes">Nota: {item.notes}</p>
            )}
          </li>
        ))}
      </ul>

      {/* Delivery info */}
      <div className="order-card__info">
        <span>{DELIVERY_LABELS[order.delivery_type]}</span>
        {order.delivery_type === "delivery" && order.address_line && (
          <span className="order-card__address">{order.address_line}</span>
        )}
        <span>{getPaymentLabel(order.payment_method_type)}</span>
        <span className="order-card__total">
          Total: ${order.total.toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      {!terminal && (
        <div className="order-card__actions">
          {nextStatus && (
            <button
              className="order-card__btn order-card__btn--advance"
              onClick={() => onAdvance(order.id, nextStatus)}
            >
              {STATUS_LABELS[nextStatus]}
            </button>
          )}
          {canCancel && !confirmingCancel && (
            <button
              className="order-card__btn order-card__btn--cancel"
              onClick={() => setConfirmingCancel(true)}
            >
              Cancelar
            </button>
          )}
          {confirmingCancel && (
            <div className="order-card__confirm">
              <span>¿Cancelar pedido?</span>
              <button
                className="order-card__btn order-card__btn--cancel"
                onClick={() => {
                  onCancel(order.id);
                  setConfirmingCancel(false);
                }}
              >
                Sí
              </button>
              <button
                className="order-card__btn"
                onClick={() => setConfirmingCancel(false)}
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
