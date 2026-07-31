import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { mediaUrl } from "@/lib/media";

// Types

interface RestaurantProfile {
  slug: string;
  name: string;
  address_line: string;
  delivery_fee: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  latitude: number | null;
  longitude: number | null;
  phone_number: string;
}

interface PaymentMethod {
  id: number;
  type: "cash" | "transfer" | "transfer_with_key";
  key_value: string;
  is_active: boolean;
}

type PaymentMethodType = PaymentMethod["type"];

const PAYMENT_TYPE_LABELS: Record<PaymentMethodType, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  transfer_with_key: "Transferencia con clave",
};

// Operating hours types
interface ScheduleEntry {
  weekday: number;
  open_time: string;
  close_time: string;
  enabled: boolean;
}

const WEEKDAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Default coordinates (Colombia center)
const DEFAULT_LAT = 4.6097;
const DEFAULT_LNG = -74.0817;

// Main component

export default function SettingsForm() {
  // Profile state
  const [profile, setProfile] = useState<RestaurantProfile>({
    slug: "",
    name: "",
    address_line: "",
    delivery_fee: "",
    logo_url: null,
    banner_url: null,
    primary_color: "#000000",
    secondary_color: "#FFFFFF",
    latitude: null,
    longitude: null,
    phone_number: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [slugCopied, setSlugCopied] = useState(false);

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);

  // Map state
  const [mapReady, setMapReady] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [pmError, setPmError] = useState("");

  // Payment method form state
  const [showPmForm, setShowPmForm] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);
  const [pmFormType, setPmFormType] = useState<PaymentMethodType>("cash");
  const [pmFormKeyValue, setPmFormKeyValue] = useState("");
  const [pmFormIsActive, setPmFormIsActive] = useState(true);
  const [pmFormSaving, setPmFormSaving] = useState(false);
  const [pmFormError, setPmFormError] = useState("");

  // Operating hours state
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  // Load profile and payment methods on mount
  useEffect(() => {
    fetchProfile();
    fetchPaymentMethods();
    fetchSchedule();
    setMapReady(true);
  }, []);

  // --- Profile ---

  async function fetchProfile() {
    setProfileLoading(true);
    try {
      const res = await apiGet("/restaurants/me/");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          slug: data.slug ?? "",
          name: data.name ?? "",
          address_line: data.address_line ?? "",
          delivery_fee: data.delivery_fee ?? "",
          logo_url: data.logo_url ?? null,
          banner_url: data.banner_url ?? null,
          primary_color: data.primary_color ?? "#000000",
          secondary_color: data.secondary_color ?? "#FFFFFF",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          phone_number: data.phone_number ?? "",
        });
      } else {
        setProfileError("No se pudo cargar el perfil.");
      }
    } catch {
      setProfileError("Error de conexión.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const res = await apiPatch("/restaurants/me/", {
        name: profile.name,
        address_line: profile.address_line,
        delivery_fee: profile.delivery_fee,
        latitude: profile.latitude,
        longitude: profile.longitude,
        phone_number: profile.phone_number,
        primary_color: profile.primary_color,
        secondary_color: profile.secondary_color,
      });

      if (res.ok) {
        setProfileMessage("Perfil actualizado correctamente.");
      } else {
        const data = await res.json();
        setProfileError(data.detail ?? "Error al guardar los cambios.");
      }
    } catch {
      setProfileError("Error de conexión.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setProfileError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiPost("/restaurants/me/upload-logo/", formData);

      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({ ...prev, logo_url: data.logo_url }));
        setProfileMessage("Logo actualizado correctamente.");
      } else {
        setProfileError("Error al subir el logo.");
      }
    } catch {
      setProfileError("Error de conexión al subir el logo.");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleBannerUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiPost("/restaurants/me/upload-banner/", formData);

      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({ ...prev, banner_url: data.banner_url }));
        setProfileMessage("Banner actualizado correctamente.");
      } else {
        setProfileError("Error al subir el banner.");
      }
    } catch {
      setProfileError("Error de conexión al subir el banner.");
    } finally {
      e.target.value = "";
    }
  }

  function handleCopySlug() {
    const publicUrl = `${window.location.origin}/${profile.slug}`;
    navigator.clipboard.writeText(publicUrl);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  }

  function handleMapClick(lat: number, lng: number) {
    setProfile((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  }

  // --- Payment Methods ---

  async function fetchPaymentMethods() {
    setPmLoading(true);
    try {
      const res = await apiGet("/restaurants/me/payment-methods/");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(Array.isArray(data) ? data : data.results ?? []);
      } else {
        setPmError("No se pudieron cargar los métodos de pago.");
      }
    } catch {
      setPmError("Error de conexión.");
    } finally {
      setPmLoading(false);
    }
  }

  function openAddPmForm() {
    setEditingPm(null);
    setPmFormType("cash");
    setPmFormKeyValue("");
    setPmFormIsActive(true);
    setPmFormError("");
    setShowPmForm(true);
  }

  function openEditPmForm(pm: PaymentMethod) {
    setEditingPm(pm);
    setPmFormType(pm.type);
    setPmFormKeyValue(pm.key_value ?? "");
    setPmFormIsActive(pm.is_active);
    setPmFormError("");
    setShowPmForm(true);
  }

  function closePmForm() {
    setShowPmForm(false);
    setEditingPm(null);
    setPmFormError("");
  }

  async function handlePmFormSubmit(e: FormEvent) {
    e.preventDefault();
    setPmFormSaving(true);
    setPmFormError("");

    const body: Record<string, unknown> = {
      type: pmFormType,
      is_active: pmFormIsActive,
    };

    if (pmFormType === "transfer_with_key") {
      body.key_value = pmFormKeyValue;
    } else {
      body.key_value = "";
    }

    try {
      let res: Response;
      if (editingPm) {
        res = await apiPatch(`/restaurants/me/payment-methods/${editingPm.id}/`, body);
      } else {
        res = await apiPost("/restaurants/me/payment-methods/", body);
      }

      if (res.ok) {
        closePmForm();
        fetchPaymentMethods();
      } else {
        const data = await res.json();
        setPmFormError(data.detail ?? data.type?.[0] ?? "Error al guardar.");
      }
    } catch {
      setPmFormError("Error de conexión.");
    } finally {
      setPmFormSaving(false);
    }
  }

  async function handleDeletePm(pm: PaymentMethod) {
    if (!confirm(`¿Eliminar método de pago "${PAYMENT_TYPE_LABELS[pm.type]}"?`)) return;

    try {
      const res = await apiDelete(`/restaurants/me/payment-methods/${pm.id}/`);
      if (res.ok || res.status === 204) {
        fetchPaymentMethods();
      } else {
        setPmError("Error al eliminar el método de pago.");
      }
    } catch {
      setPmError("Error de conexión.");
    }
  }

  // --- Operating Hours ---

  async function fetchSchedule() {
    setScheduleLoading(true);
    try {
      const res = await apiGet("/restaurants/me/operating-hours/");
      if (res.ok) {
        const data = await res.json();
        // Build full 7-day schedule, marking days that have records as enabled
        const existing = Array.isArray(data) ? data : data.results ?? [];
        const full: ScheduleEntry[] = Array.from({ length: 7 }, (_, i) => {
          const found = existing.find((e: any) => e.weekday === i);
          return {
            weekday: i,
            open_time: found ? found.open_time.slice(0, 5) : "08:00",
            close_time: found ? found.close_time.slice(0, 5) : "20:00",
            enabled: !!found,
          };
        });
        setSchedule(full);
      }
    } catch {
      setScheduleError("Error al cargar horarios.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleScheduleSave() {
    setScheduleSaving(true);
    setScheduleMessage("");
    setScheduleError("");

    const payload = schedule
      .filter((s) => s.enabled)
      .map((s) => ({
        weekday: s.weekday,
        open_time: s.open_time,
        close_time: s.close_time,
      }));

    try {
      const res = await fetch(
        `${import.meta.env.PUBLIC_API_BASE ?? "http://192.168.100.165:8000/api/v1"}/restaurants/me/operating-hours/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("footstep_access_token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setScheduleMessage("Horario actualizado correctamente.");
      } else {
        const data = await res.json().catch(() => ({}));
        setScheduleError(data.detail ?? "Error al guardar el horario.");
      }
    } catch {
      setScheduleError("Error de conexión.");
    } finally {
      setScheduleSaving(false);
    }
  }

  function updateScheduleEntry(weekday: number, field: string, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((s) => (s.weekday === weekday ? { ...s, [field]: value } : s))
    );
  }

  // --- Render ---

  if (profileLoading) {
    return <p className="text-gray-500">Cargando configuración...</p>;
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Perfil del restaurante</h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Slug (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enlace público (slug)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 font-mono">
                {window.location.origin}/{profile.slug}
              </div>
              <button
                type="button"
                onClick={handleCopySlug}
                className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                  slugCopied
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {slugCopied ? "✓ Copiado" : "Copiar enlace"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Comparte este enlace con tus clientes para que vean tu menú.</p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              {profile.logo_url ? (
                <img
                  src={mediaUrl(profile.logo_url)}
                  alt="Logo del restaurante"
                  className="w-16 h-16 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <span className="text-gray-400 text-xs">Sin logo</span>
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors">
                {logoUploading ? "Subiendo..." : "📷 Cambiar logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* White Label Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Marca blanca</h3>

            {/* Banner */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner</label>
              <div className="flex items-center gap-4">
                {profile.banner_url ? (
                  <img src={mediaUrl(profile.banner_url)} alt="Banner" className="h-16 w-40 object-cover rounded border border-gray-200" />
                ) : (
                  <div className="h-16 w-40 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Sin banner</span>
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors">
                  📷 Subir banner
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-1">Color primario</label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary_color"
                    type="color"
                    value={profile.primary_color}
                    onChange={(e) => setProfile((p) => ({ ...p, primary_color: e.target.value }))}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={profile.primary_color}
                    onChange={(e) => setProfile((p) => ({ ...p, primary_color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-1">Color secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    id="secondary_color"
                    type="color"
                    value={profile.secondary_color}
                    onChange={(e) => setProfile((p) => ({ ...p, secondary_color: e.target.value }))}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={profile.secondary_color}
                    onChange={(e) => setProfile((p) => ({ ...p, secondary_color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Los colores se aplicarán a la página de tu menú en una próxima actualización.</p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              id="address"
              type="text"
              value={profile.address_line}
              onChange={(e) => setProfile((p) => ({ ...p, address_line: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono del restaurante
            </label>
            <input
              id="phone_number"
              type="tel"
              value={profile.phone_number}
              onChange={(e) => setProfile((p) => ({ ...p, phone_number: e.target.value }))}
              placeholder="Ej: 3001234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Delivery Fee */}
          <div>
            <label htmlFor="delivery_fee" className="block text-sm font-medium text-gray-700 mb-1">
              Tarifa de envío
            </label>
            <input
              id="delivery_fee"
              type="number"
              step="1"
              min="0"
              value={profile.delivery_fee}
              onChange={(e) => setProfile((p) => ({ ...p, delivery_fee: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Mini Map for coordinates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación del restaurante
            </label>
            <p className="text-xs text-gray-500 mb-2">Haz clic en el mapa para marcar la ubicación de tu restaurante.</p>
            {mapReady && (
              <LocationPicker
                latitude={profile.latitude}
                longitude={profile.longitude}
                onLocationChange={handleMapClick}
              />
            )}
            {profile.latitude && profile.longitude && (
              <p className="text-xs text-gray-500 mt-2">
                📍 {Number(profile.latitude).toFixed(6)}, {Number(profile.longitude).toFixed(6)}
              </p>
            )}
          </div>

          {/* Messages */}
          {profileMessage && (
            <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{profileMessage}</p>
          )}
          {profileError && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{profileError}</p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      {/* Payment Methods Section */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Métodos de pago</h2>
          <button
            type="button"
            onClick={openAddPmForm}
            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Agregar
          </button>
        </div>

        {pmError && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">{pmError}</p>
        )}

        {pmLoading ? (
          <p className="text-gray-500 text-sm">Cargando métodos de pago...</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay métodos de pago configurados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {paymentMethods.map((pm) => (
              <li key={pm.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">
                    {PAYMENT_TYPE_LABELS[pm.type] ?? pm.type}
                  </span>
                  {pm.type === "transfer_with_key" && pm.key_value && (
                    <span className="ml-2 text-sm text-gray-500">({pm.key_value})</span>
                  )}
                  {!pm.is_active && (
                    <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPmForm(pm)}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePm(pm)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Payment Method Add/Edit Form */}
        {showPmForm && (
          <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {editingPm ? "Editar método de pago" : "Agregar método de pago"}
            </h3>
            <form onSubmit={handlePmFormSubmit} className="space-y-3">
              <div>
                <label htmlFor="pm_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  id="pm_type"
                  value={pmFormType}
                  onChange={(e) => setPmFormType(e.target.value as PaymentMethodType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="transfer_with_key">Transferencia con clave</option>
                </select>
              </div>

              {pmFormType === "transfer_with_key" && (
                <div>
                  <label htmlFor="pm_key" className="block text-sm font-medium text-gray-700 mb-1">
                    Clave de transferencia
                  </label>
                  <input
                    id="pm_key"
                    type="text"
                    value={pmFormKeyValue}
                    onChange={(e) => setPmFormKeyValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="pm_active"
                  type="checkbox"
                  checked={pmFormIsActive}
                  onChange={(e) => setPmFormIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="pm_active" className="text-sm text-gray-700">
                  Activo
                </label>
              </div>

              {pmFormError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{pmFormError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pmFormSaving}
                  className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pmFormSaving ? "Guardando..." : editingPm ? "Actualizar" : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={closePmForm}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Operating Hours Section */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Horario de funcionamiento</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configura los días y horas en que tu restaurante acepta pedidos. Los días desactivados aparecerán como "Sin servicio".
        </p>

        {scheduleLoading ? (
          <p className="text-gray-500 text-sm">Cargando horarios...</p>
        ) : (
          <div className="space-y-3">
            {schedule.map((entry) => (
              <div key={entry.weekday} className={`flex items-center gap-3 p-3 rounded-lg border ${entry.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"}`}>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => updateScheduleEntry(entry.weekday, "enabled", e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span className={`w-24 text-sm font-medium ${entry.enabled ? "text-gray-900" : "text-gray-400"}`}>
                  {WEEKDAY_LABELS[entry.weekday]}
                </span>
                {entry.enabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={entry.open_time}
                      onChange={(e) => updateScheduleEntry(entry.weekday, "open_time", e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-gray-500 text-sm">a</span>
                    <input
                      type="time"
                      value={entry.close_time}
                      onChange={(e) => updateScheduleEntry(entry.weekday, "close_time", e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
                {!entry.enabled && (
                  <span className="text-sm text-gray-400 italic">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        )}

        {scheduleMessage && (
          <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md mt-4">{scheduleMessage}</p>
        )}
        {scheduleError && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mt-4">{scheduleError}</p>
        )}

        <button
          type="button"
          onClick={handleScheduleSave}
          disabled={scheduleSaving}
          className="mt-4 px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scheduleSaving ? "Guardando..." : "Guardar horario"}
        </button>
      </section>
    </div>
  );
}

// --- Location Picker Component (Leaflet) ---

function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues with Leaflet
    import("leaflet").then((L) => {
      // Fix default marker icon issue with bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const initialLat = latitude ?? DEFAULT_LAT;
      const initialLng = longitude ?? DEFAULT_LNG;
      const initialZoom = latitude ? 15 : 6;

      const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView(
        [initialLat, initialLng],
        initialZoom
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add marker if coordinates exist
      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude]).addTo(map);
      }

      // Click handler
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        onLocationChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker when coordinates change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg border border-gray-300 z-0"
      />
    </>
  );
}
