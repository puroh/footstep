import { formatPrice } from "@/lib/pricing";
import { mediaUrl } from "@/lib/media";

interface OrderTopping {
  name: string;
  extra_price: number;
}

interface OrderItem {
  product_name: string;
  unit_price: number;
  notes: string;
  toppings: OrderTopping[];
}

interface Order {
  reference_number: string;
  status: string;
  delivery_type: string;
  address_line: string;
  customer_phone: string;
  payment_method_type: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  items: OrderItem[];
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_logo_url: string;
  restaurant_address: string;
  created_at: string;
}

interface Props {
  order: Order | null;
  error: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  received: { label: "Recibido", color: "text-red-700", bg: "bg-red-100" },
  confirmed: { label: "Confirmado", color: "text-orange-700", bg: "bg-orange-100" },
  in_preparation: { label: "En preparación", color: "text-yellow-700", bg: "bg-yellow-100" },
  completed: { label: "Completado", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelado", color: "text-gray-700", bg: "bg-gray-200" },
};

const STATUS_ORDER = ["received", "confirmed", "in_preparation", "completed"];

const DELIVERY_LABELS: Record<string, string> = {
  delivery: "🛵 Domicilio",
  pickup: "🏪 Recoger en el local",
  dine_in: "🍽️ Comer en el local",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  transfer_with_key: "Transferencia",
};

export default function OrderTracking({ order, error }: Props) {
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h2>
          <p className="text-gray-600">El número de referencia no corresponde a ningún pedido.</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.received;
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Restaurant Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            {order.restaurant_logo_url && (
              <img
                src={mediaUrl(order.restaurant_logo_url)}
                alt={order.restaurant_name}
                className="w-14 h-14 rounded-full object-cover border border-gray-200"
              />
            )}
            <div>
              <h2 className="font-bold text-gray-900">{order.restaurant_name}</h2>
              {order.restaurant_address && (
                <p className="text-sm text-gray-500">{order.restaurant_address}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Pedido #{order.reference_number}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(order.created_at).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} ${statusConfig.bg}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        {!isCancelled && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Estado del pedido</h2>
            <div className="flex items-center justify-between">
              {STATUS_ORDER.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const stepConf = STATUS_CONFIG[step];
                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <span className={`text-xs mt-1 text-center ${isCompleted ? "text-green-700 font-medium" : "text-gray-400"}`}>
                      {stepConf.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 font-medium">Este pedido fue cancelado.</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Productos</h2>
          <ul className="space-y-3">
            {order.items.map((item, i) => (
              <li key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">{item.product_name}</span>
                  <span className="text-sm text-gray-600">{formatPrice(item.unit_price)}</span>
                </div>
                {item.toppings.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {item.toppings.map((t, j) => (
                      <li key={j} className="text-xs text-gray-500">+ {t.name} ({formatPrice(t.extra_price)})</li>
                    ))}
                  </ul>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-500 italic mt-1">📝 {item.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Delivery & Payment Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Detalles</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tipo de entrega</span>
              <span className="text-gray-900">{DELIVERY_LABELS[order.delivery_type] ?? order.delivery_type}</span>
            </div>
            {order.address_line && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dirección</span>
                <span className="text-gray-900 text-right max-w-[60%]">{order.address_line}</span>
              </div>
            )}
            {order.customer_phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Teléfono</span>
                <span className="text-gray-900">{order.customer_phone}</span>
              </div>
            )}
            {order.payment_method_type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Método de pago</span>
                <span className="text-gray-900">{PAYMENT_LABELS[order.payment_method_type] ?? order.payment_method_type}</span>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Domicilio</span>
                <span className="text-gray-900">{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
