import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { $cartItems, $cartItemCount, $cartSubtotal, addToCart, clearCart, removeFromCart, type CartItem, type CartItemTopping } from "@/stores/cart";
import { computeOrderTotal, formatPrice } from "@/lib/pricing";
import { validateAddress, buildAddressLine, type AddressFields } from "@/lib/validation";
import { mediaUrl } from "@/lib/media";

// Types
interface Topping { id: string; name: string; extra_price: number; is_active: boolean; }
interface Product { id: string; name: string; description: string; photo_url: string; base_price: number; is_active: boolean; label: string; toppings: Topping[]; }
interface Category { id: string; name: string; is_active: boolean; products: Product[]; }
interface PaymentMethod { id: string; type: string; key_value: string; is_active: boolean; }
interface Restaurant { id: string; name: string; slug: string; logo_url: string; address_line: string; delivery_fee: number; payment_methods?: PaymentMethod[]; }
interface MenuData { restaurant: Restaurant; categories: Category[]; uncategorized_products: Product[]; }
interface Props { restaurant: Restaurant; menuData: MenuData; slug: string; }

type Step = "menu" | "delivery" | "address" | "payment" | "confirmation";
type DeliveryType = "delivery" | "pickup" | "dine_in";

const API_BASE = typeof window !== "undefined"
  ? (import.meta.env.PUBLIC_API_BASE ?? "http://localhost:8000/api/v1")
  : "http://backend:8000/api/v1";

export default function PublicMenu({ restaurant, menuData, slug }: Props) {
  const [step, setStep] = useState<Step>("menu");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [address, setAddress] = useState<AddressFields>({ phone: "", address: "", neighborhood: "", city: "" });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [cashDenomination, setCashDenomination] = useState<string>("");
  const [orderRef, setOrderRef] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const cartItems = useStore($cartItems);
  const cartCount = useStore($cartItemCount);
  const cartSubtotal = useStore($cartSubtotal);

  const categories = menuData.categories || [];
  const uncategorized = menuData.uncategorized_products || [];
  const paymentMethods = (restaurant.payment_methods || []).filter(pm => pm.is_active);

  // Compute totals
  const orderTotal = computeOrderTotal(cartItems, restaurant.delivery_fee, deliveryType);

  // Auto-select first payment method if only one exists or none selected
  useEffect(() => {
    if (step === "payment" && !selectedPaymentId && paymentMethods.length > 0) {
      setSelectedPaymentId(paymentMethods[0].id);
    }
  }, [step, paymentMethods, selectedPaymentId]);

  function handlePay() {
    if (cartCount === 0) return;
    setStep("delivery");
  }

  function handleDeliveryNext() {
    setStep("address");
  }

  function handleAddressNext() {
    if (deliveryType !== "delivery") {
      const phoneErrors: Record<string, string> = {};
      if (!address.phone || !address.phone.trim()) {
        phoneErrors.phone = "Este campo es obligatorio";
      }
      if (Object.keys(phoneErrors).length > 0) {
        setAddressErrors(phoneErrors);
        return;
      }
    } else {
      const errors = validateAddress(address);
      if (Object.keys(errors).length > 0) {
        setAddressErrors(errors);
        return;
      }
    }
    setAddressErrors({});
    setStep("payment");
  }

  async function handleSubmitOrder() {
    setSubmitting(true);
    setSubmitError("");

    const selectedPm = paymentMethods.find(pm => pm.id === selectedPaymentId);
    if (!selectedPm) {
      setSubmitError("Selecciona un método de pago");
      setSubmitting(false);
      return;
    }
    if (selectedPm.type === "cash" && !cashDenomination) {
      setSubmitError("Indica con cuánto pagas");
      setSubmitting(false);
      return;
    }

    const payload = {
      restaurant_slug: slug,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        toppings: item.toppings.map(t => ({ topping_id: t.topping_id })),
        notes: item.notes,
      })),
      delivery_type: deliveryType,
      payment_method_id: selectedPaymentId,
      address_line: deliveryType === "delivery" ? buildAddressLine(address) : "",
      customer_phone: address.phone,
      cash_denomination: selectedPm.type === "cash" ? parseInt(cashDenomination) : null,
      telegram_chat_id: "",
    };

    try {
      const res = await fetch(`${API_BASE}/orders/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.message || "Error al crear el pedido");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setOrderRef(data.reference_number);
      clearCart();
      setStep("confirmation");
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- CONFIRMATION SCREEN ---
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido confirmado!</h2>
          <p className="text-gray-600 mb-4">Tu número de referencia es:</p>
          <a href={`/order/${orderRef}`} className="text-3xl font-mono font-bold text-green-700 mb-6 block underline hover:text-green-800 transition-colors">
            {orderRef}
          </a>
          <p className="text-sm text-gray-500">Toca el código para ver el estado de tu pedido.</p>
        </div>
      </div>
    );
  }

  // --- PAYMENT STEP ---
  if (step === "payment") {
    const selectedPm = paymentMethods.find(pm => pm.id === selectedPaymentId);
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setStep("address")} className="text-blue-600 mb-4">← Volver</button>
          <h2 className="text-xl font-bold mb-4">Método de pago</h2>
          <div className="space-y-3 mb-6">
            {paymentMethods.map(pm => (
              <label key={pm.id} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${selectedPaymentId === pm.id ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                <input type="radio" name="payment" checked={selectedPaymentId === pm.id} onChange={() => setSelectedPaymentId(pm.id)} className="accent-green-600" />
                <span className="font-medium">{pm.type === "cash" ? "Efectivo" : pm.type === "transfer" ? "Transferencia" : "Transferencia"}</span>
              </label>
            ))}
          </div>

          {selectedPm?.type === "cash" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Con cuánto pagas?</label>
              <input type="number" value={cashDenomination} onChange={e => setCashDenomination(e.target.value)} placeholder="Ej: 50000" className="w-full border rounded-lg p-3" />
            </div>
          )}

          {selectedPm && (selectedPm.type === "transfer" || selectedPm.type === "transfer_with_key") && selectedPm.key_value && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">Llave de transferencia:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">{selectedPm.key_value}</code>
                <button onClick={() => navigator.clipboard.writeText(selectedPm.key_value)} className="text-xs bg-blue-600 text-white px-3 py-2 rounded">Copiar</button>
              </div>
              <p className="text-xs text-blue-600 mt-2">Envía el comprobante al chat del restaurante.</p>
            </div>
          )}

          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(orderTotal.subtotal)}</span></div>
            {orderTotal.delivery_fee > 0 && <div className="flex justify-between text-sm mt-1"><span>Domicilio</span><span>{formatPrice(orderTotal.delivery_fee)}</span></div>}
            <div className="flex justify-between font-bold mt-2 pt-2 border-t"><span>Total</span><span>{formatPrice(orderTotal.total)}</span></div>
          </div>

          {submitError && <p className="text-red-600 text-sm mb-4">{submitError}</p>}

          <button onClick={handleSubmitOrder} disabled={!selectedPaymentId || submitting} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
            {submitting ? "Procesando..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    );
  }

  // --- ADDRESS STEP ---
  if (step === "address") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setStep("delivery")} className="text-blue-600 mb-4">← Volver</button>
          <h2 className="text-xl font-bold mb-4">{deliveryType === "delivery" ? "Datos de entrega" : "Datos de contacto"}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de contacto</label>
              <input type="tel" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} placeholder="Ej: 3001234567" className={`w-full border rounded-lg p-3 ${addressErrors.phone ? "border-red-500" : ""}`} />
              {addressErrors.phone && <p className="text-red-500 text-xs mt-1">{addressErrors.phone}</p>}
            </div>
            {deliveryType === "delivery" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={address.address} onChange={e => setAddress({...address, address: e.target.value})} placeholder="Ej: Calle 45 #23-12, Apto 301" className={`w-full border rounded-lg p-3 ${addressErrors.address ? "border-red-500" : ""}`} />
                  {addressErrors.address && <p className="text-red-500 text-xs mt-1">{addressErrors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
                  <input type="text" value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} placeholder="Ej: Laureles" className={`w-full border rounded-lg p-3 ${addressErrors.neighborhood ? "border-red-500" : ""}`} />
                  {addressErrors.neighborhood && <p className="text-red-500 text-xs mt-1">{addressErrors.neighborhood}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} placeholder="Ej: Medellín" className={`w-full border rounded-lg p-3 ${addressErrors.city ? "border-red-500" : ""}`} />
                  {addressErrors.city && <p className="text-red-500 text-xs mt-1">{addressErrors.city}</p>}
                </div>
                {/* Mini map */}
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marca tu ubicación (opcional)</label>
                  <DeliveryMapPicker />
                </div>
              </>
            )}
          </div>
          <button onClick={handleAddressNext} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium mt-6">Continuar</button>
        </div>
      </div>
    );
  }

  // --- DELIVERY TYPE STEP ---
  if (step === "delivery") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setStep("menu")} className="text-blue-600 mb-4">← Volver al menú</button>
          <h2 className="text-xl font-bold mb-4">¿Cómo quieres recibir tu pedido?</h2>
          <div className="space-y-3">
            {([["delivery", "🛵 Domicilio"], ["pickup", "🏪 Recoger en el local"], ["dine_in", "🍽️ Comer en el local"]] as const).map(([value, label]) => (
              <label key={value} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${deliveryType === value ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                <input type="radio" name="delivery" checked={deliveryType === value} onChange={() => setDeliveryType(value)} className="accent-green-600" />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
          {(deliveryType === "pickup" || deliveryType === "dine_in") && restaurant.address_line && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800">Dirección del restaurante:</p>
              <p className="text-sm text-blue-700 mt-1">{restaurant.address_line}</p>
            </div>
          )}
          <button onClick={handleDeliveryNext} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium mt-6">Continuar</button>
        </div>
      </div>
    );
  }

  // --- MENU STEP (default) ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {restaurant.logo_url && <img src={mediaUrl(restaurant.logo_url)} alt={restaurant.name} className="w-12 h-12 rounded-full object-cover" />}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">{restaurant.address_line}</p>
          </div>
        </div>
      </header>

      {/* Categories and Products */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {categories.length === 0 && uncategorized.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Este restaurante aún no tiene productos.</p>
        ) : (
          <>
            {categories.map(cat => (
              <section key={cat.id} className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{cat.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cat.products.map(p => (
                    <button key={p.id} onClick={() => setSelectedProduct(p)} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left w-full">
                      {p.photo_url && <img src={mediaUrl(p.photo_url)} alt={p.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
                          {p.label && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{p.label}</span>}
                        </div>
                        {p.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                        <p className="text-sm font-semibold text-green-700 mt-2">{formatPrice(p.base_price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {uncategorized.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Otros productos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uncategorized.map(p => (
                    <button key={p.id} onClick={() => setSelectedProduct(p)} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left w-full">
                      {p.photo_url && <img src={mediaUrl(p.photo_url)} alt={p.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
                        <p className="text-sm font-semibold text-green-700 mt-2">{formatPrice(p.base_price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Order Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-green-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">{cartCount}</span>
              <span className="font-medium text-gray-700">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={clearCart} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg">Cancelar pedido</button>
              <button onClick={handlePay} className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg font-medium">Pagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}

// --- PRODUCT DETAIL MODAL ---
function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [selectedToppings, setSelectedToppings] = useState<CartItemTopping[]>([]);
  const [notes, setNotes] = useState("");
  const activeToppings = product.toppings.filter(t => t.is_active);

  function toggleTopping(topping: Topping) {
    setSelectedToppings(prev => {
      const exists = prev.find(t => t.topping_id === topping.id);
      if (exists) return prev.filter(t => t.topping_id !== topping.id);
      return [...prev, { topping_id: topping.id, name: topping.name, extra_price: topping.extra_price }];
    });
  }

  function handleAccept() {
    addToCart({
      product_id: product.id,
      product_name: product.name,
      photo_url: product.photo_url,
      base_price: product.base_price,
      toppings: selectedToppings,
      notes,
    });
    onClose();
  }

  const itemTotal = product.base_price + selectedToppings.reduce((s, t) => s + t.extra_price, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {product.photo_url && <img src={mediaUrl(product.photo_url)} alt={product.name} className="w-full h-48 object-cover" />}
        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          {product.description && <p className="text-gray-600 mt-2">{product.description}</p>}
          <p className="text-lg font-semibold text-green-700 mt-3">{formatPrice(product.base_price)}</p>

          {activeToppings.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-800 mb-2">Adicionales</h3>
              <div className="space-y-2">
                {activeToppings.map(t => (
                  <label key={t.id} className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!selectedToppings.find(st => st.topping_id === t.id)} onChange={() => toggleTopping(t)} className="accent-green-600 w-4 h-4" />
                      <span className="text-sm text-gray-700">{t.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">+{formatPrice(t.extra_price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Indicaciones especiales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: sin cebolla, carne bien cocida..." className="w-full border rounded-lg p-3 text-sm" rows={2} />
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 border border-gray-300 py-3 rounded-lg font-medium text-gray-700">Cancelar</button>
            <button onClick={handleAccept} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium">Agregar {formatPrice(itemTotal)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DELIVERY MAP PICKER ---
function DeliveryMapPicker() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([4.6097, -74.0817], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      let marker: any = null;
      map.on("click", (e: any) => {
        if (marker) marker.setLatLng(e.latlng);
        else marker = L.marker(e.latlng).addTo(map);
      });

      mapInstanceRef.current = map;
    });

    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} className="w-full h-48 rounded-lg border border-gray-300" />
    </>
  );
}
