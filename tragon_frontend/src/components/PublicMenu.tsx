import { useState } from "react";

interface Topping {
  id: string;
  name: string;
  extra_price: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  photo_url: string;
  base_price: number;
  is_active: boolean;
  label: string;
  toppings: Topping[];
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  products: Product[];
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  address_line: string;
  delivery_fee: number;
}

interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  uncategorized_products: Product[];
}

interface Props {
  restaurant: Restaurant;
  menuData: MenuData;
  slug: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function PublicMenu({ restaurant, menuData, slug }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = menuData.categories || [];
  const uncategorized = menuData.uncategorized_products || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {restaurant.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">{restaurant.address_line}</p>
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {categories.length === 0 && uncategorized.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Este restaurante aún no tiene productos en su menú.</p>
          </div>
        ) : (
          <>
            {categories.map((category) => (
              <section key={category.id} className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {uncategorized.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Otros productos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uncategorized.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Footer with delivery fee info */}
      {restaurant.delivery_fee > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 px-4 text-center text-sm text-gray-600">
          Domicilio: {formatPrice(restaurant.delivery_fee)}
        </footer>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left w-full"
    >
      {product.photo_url && (
        <img
          src={product.photo_url}
          alt={product.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
          {product.label && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full whitespace-nowrap">
              {product.label}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className="text-sm font-semibold text-green-700 mt-2">
          {formatPrice(product.base_price)}
        </p>
      </div>
    </button>
  );
}

function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const activeToppings = product.toppings.filter((t) => t.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Product image */}
        {product.photo_url && (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          {product.description && (
            <p className="text-gray-600 mt-2">{product.description}</p>
          )}
          <p className="text-lg font-semibold text-green-700 mt-3">
            {formatPrice(product.base_price)}
          </p>

          {/* Toppings */}
          {activeToppings.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-800 mb-2">Adicionales</h3>
              <ul className="space-y-2">
                {activeToppings.map((topping) => (
                  <li key={topping.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{topping.name}</span>
                    <span className="text-gray-500">+{formatPrice(topping.extra_price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-6 w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
