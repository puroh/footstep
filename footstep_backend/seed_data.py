"""
Seed script to populate the database with test data for 3 restaurants.

Usage:
    docker compose exec backend uv run python manage.py shell < seed_data.py

Or:
    docker compose exec backend uv run python seed_data.py
"""

import os
import sys
from datetime import time

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.catalog.models import Category, Product, Topping
from apps.restaurants.models import OperatingHour, Owner, PaymentMethod, Restaurant

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def create_restaurant(
    email, password, owner_name, restaurant_name, address, phone, delivery_fee
):
    """Create owner + restaurant, return (owner, restaurant)."""
    if Owner.objects.filter(email=email).exists():
        owner = Owner.objects.get(email=email)
        restaurant = owner.restaurant
        print(f"  [exists] {restaurant_name} ({restaurant.slug})")
        return owner, restaurant

    owner = Owner.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=owner_name,
    )
    restaurant = Restaurant.objects.create(
        owner=owner,
        name=restaurant_name,
        address_line=address,
        phone_number=phone,
        telegram_chat_id="",
        delivery_fee=delivery_fee,
    )
    print(f"  [created] {restaurant_name} ({restaurant.slug})")
    return owner, restaurant


def add_payment_methods(restaurant):
    """Add cash and transfer_with_key payment methods."""
    PaymentMethod.objects.get_or_create(
        restaurant=restaurant,
        type="cash",
        defaults={"is_active": True},
    )
    PaymentMethod.objects.get_or_create(
        restaurant=restaurant,
        type="transfer_with_key",
        defaults={"key_value": "3001234567", "is_active": True},
    )


def add_schedule(restaurant, days, open_h, close_h):
    """Set operating hours for the given weekdays."""
    OperatingHour.objects.filter(restaurant=restaurant).delete()
    for day in days:
        OperatingHour.objects.create(
            restaurant=restaurant,
            weekday=day,
            open_time=time(open_h, 0),
            close_time=time(close_h, 0),
        )


def add_category(restaurant, name):
    cat, _ = Category.objects.get_or_create(
        restaurant=restaurant, name=name, defaults={"is_active": True}
    )
    return cat


def add_product(category, name, description, price, label=""):
    prod, _ = Product.objects.get_or_create(
        category=category,
        name=name,
        defaults={
            "description": description,
            "base_price": price,
            "is_active": True,
            "label": label,
        },
    )
    return prod


def add_topping(product, name, extra_price):
    Topping.objects.get_or_create(
        product=product,
        name=name,
        defaults={"extra_price": extra_price, "is_active": True},
    )


# ---------------------------------------------------------------------------
# Restaurant 1: Comida Rápida — "Burger Town"
# ---------------------------------------------------------------------------

print("\n=== Restaurante 1: Burger Town (Comida Rápida) ===")
owner1, r1 = create_restaurant(
    email="burger@test.com",
    password="test1234",
    owner_name="Carlos Gómez",
    restaurant_name="Burger Town",
    address="Calle 10 #5-23, Centro, Pereira",
    phone="3101234567",
    delivery_fee=5000,
)
add_payment_methods(r1)
add_schedule(r1, days=[0, 1, 2, 3, 4, 5, 6], open_h=10, close_h=22)

# Categories
cat_burgers = add_category(r1, "Hamburguesas")
cat_hotdogs = add_category(r1, "Perros Calientes")
cat_combos = add_category(r1, "Combos")
cat_bebidas = add_category(r1, "Bebidas")

# Hamburguesas
p = add_product(cat_burgers, "Hamburguesa Clásica", "Carne 150g, lechuga, tomate, cebolla, salsa especial", 15000, label="Más vendida")
add_topping(p, "Queso extra", 2000)
add_topping(p, "Tocineta", 3000)
add_topping(p, "Huevo frito", 2500)

p = add_product(cat_burgers, "Hamburguesa Doble", "Doble carne 300g, queso cheddar, cebolla caramelizada", 22000)
add_topping(p, "Queso extra", 2000)
add_topping(p, "Tocineta", 3000)
add_topping(p, "Jalapeños", 1500)

p = add_product(cat_burgers, "Hamburguesa BBQ", "Carne 150g, tocineta, cebolla crispy, salsa BBQ", 18000)
add_topping(p, "Queso extra", 2000)
add_topping(p, "Piña", 1500)

p = add_product(cat_burgers, "Hamburguesa Pollo", "Pechuga apanada, lechuga, tomate, mayonesa", 16000)
add_topping(p, "Queso extra", 2000)
add_topping(p, "Aguacate", 3000)

# Perros Calientes
p = add_product(cat_hotdogs, "Perro Sencillo", "Salchicha americana, salsas, papas chip", 10000)
add_topping(p, "Queso extra", 2000)
add_topping(p, "Carne desmechada", 4000)

p = add_product(cat_hotdogs, "Perro Especial", "Salchicha americana, queso, tocineta, salsas", 14000)
add_topping(p, "Chorizo", 3500)
add_topping(p, "Ripio", 1500)

# Combos
add_product(cat_combos, "Combo Clásico", "Hamburguesa Clásica + papas + gaseosa", 22000)
add_product(cat_combos, "Combo Doble", "Hamburguesa Doble + papas + gaseosa", 28000)
add_product(cat_combos, "Combo Familiar", "2 Hamburguesas + 2 perros + 4 gaseosas", 55000, label="Para compartir")

# Bebidas
add_product(cat_bebidas, "Coca-Cola 400ml", "Coca-Cola personal", 4000)
add_product(cat_bebidas, "Limonada Natural", "Limonada con hierbabuena", 5000)
add_product(cat_bebidas, "Malteada Chocolate", "Malteada con helado de chocolate", 9000)

# ---------------------------------------------------------------------------
# Restaurant 2: Comida Japonesa — "Sakura Sushi"
# ---------------------------------------------------------------------------

print("\n=== Restaurante 2: Sakura Sushi (Comida Japonesa) ===")
owner2, r2 = create_restaurant(
    email="sakura@test.com",
    password="test1234",
    owner_name="María López",
    restaurant_name="Sakura Sushi",
    address="Carrera 15 #72-40, Local 3, Bogotá",
    phone="3209876543",
    delivery_fee=7000,
)
add_payment_methods(r2)
add_schedule(r2, days=[1, 2, 3, 4, 5, 6], open_h=11, close_h=21)  # Closed Monday

# Categories
cat_rolls = add_category(r2, "Rolls")
cat_sashimi = add_category(r2, "Sashimi")
cat_ramen = add_category(r2, "Ramen")
cat_entradas = add_category(r2, "Entradas")
cat_bebidas2 = add_category(r2, "Bebidas")

# Rolls
p = add_product(cat_rolls, "California Roll", "Cangrejo, aguacate, pepino, ajonjolí (8 piezas)", 28000, label="Más vendido")
add_topping(p, "Queso crema", 3000)
add_topping(p, "Salsa anguila", 2000)

p = add_product(cat_rolls, "Philadelphia Roll", "Salmón, queso crema, aguacate (8 piezas)", 32000)
add_topping(p, "Ajonjolí extra", 1500)
add_topping(p, "Cebollín", 1000)

p = add_product(cat_rolls, "Spicy Tuna Roll", "Atún picante, pepino, sriracha (8 piezas)", 30000)
add_topping(p, "Aguacate", 3000)
add_topping(p, "Tempura flakes", 2000)

p = add_product(cat_rolls, "Tempura Roll", "Langostino tempura, aguacate, salsa anguila (8 piezas)", 35000)
add_topping(p, "Queso crema", 3000)
add_topping(p, "Salmón extra", 5000)

p = add_product(cat_rolls, "Dragon Roll", "Langostino, aguacate laminado, salsa anguila (8 piezas)", 38000, label="Premium")
add_topping(p, "Tobiko", 4000)

# Sashimi
add_product(cat_sashimi, "Sashimi de Salmón", "6 láminas frescas de salmón noruego", 35000)
add_product(cat_sashimi, "Sashimi de Atún", "6 láminas de atún rojo", 33000)
add_product(cat_sashimi, "Sashimi Mixto", "3 salmón + 3 atún + 3 pulpo", 42000)

# Ramen
p = add_product(cat_ramen, "Tonkotsu Ramen", "Caldo de cerdo 12h, chashu, huevo, fideos artesanales", 32000)
add_topping(p, "Huevo extra", 3000)
add_topping(p, "Chashu extra", 5000)
add_topping(p, "Maíz", 2000)

p = add_product(cat_ramen, "Shoyu Ramen", "Caldo de soya, pollo, brotes de bambú, nori", 28000)
add_topping(p, "Huevo extra", 3000)
add_topping(p, "Tofu", 3000)

# Entradas
add_product(cat_entradas, "Gyozas (6 und)", "Empanaditas japonesas de cerdo y verduras", 18000)
add_product(cat_entradas, "Edamame", "Vainas de soya con sal marina", 12000)
add_product(cat_entradas, "Takoyaki (4 und)", "Bolitas de pulpo con salsa takoyaki y bonito", 16000)

# Bebidas
add_product(cat_bebidas2, "Té Verde Frío", "Té verde natural con hielo", 6000)
add_product(cat_bebidas2, "Ramune", "Gaseosa japonesa sabor original", 8000)
add_product(cat_bebidas2, "Sake Caliente", "Copa de sake servido caliente", 15000)

# ---------------------------------------------------------------------------
# Restaurant 3: Carne a la Parrilla — "El Fogón Parrilla"
# ---------------------------------------------------------------------------

print("\n=== Restaurante 3: El Fogón Parrilla (Carne a la Parrilla) ===")
owner3, r3 = create_restaurant(
    email="fogon@test.com",
    password="test1234",
    owner_name="Andrés Martínez",
    restaurant_name="El Fogón Parrilla",
    address="Avenida 30 de Agosto #42-15, Pereira",
    phone="3154567890",
    delivery_fee=6000,
)
add_payment_methods(r3)
add_schedule(r3, days=[2, 3, 4, 5, 6], open_h=12, close_h=22)  # Closed Mon-Tue

# Categories
cat_cortes = add_category(r3, "Cortes de Carne")
cat_acomp = add_category(r3, "Acompañamientos")
cat_parrilladas = add_category(r3, "Parrilladas")
cat_entradas3 = add_category(r3, "Entradas")
cat_bebidas3 = add_category(r3, "Bebidas")

# Cortes de Carne
p = add_product(cat_cortes, "Churrasco 350g", "Corte premium a la parrilla con chimichurri", 38000, label="Recomendado")
add_topping(p, "Papas al horno", 5000)
add_topping(p, "Ensalada verde", 4000)

p = add_product(cat_cortes, "Punta de Anca 300g", "Corte jugoso sellado a la parrilla", 35000)
add_topping(p, "Papas al horno", 5000)
add_topping(p, "Mazorca asada", 4000)

p = add_product(cat_cortes, "Baby Beef 400g", "Lomo fino grueso con mantequilla de hierbas", 42000)
add_topping(p, "Salsa de champiñones", 5000)
add_topping(p, "Ensalada César", 6000)

p = add_product(cat_cortes, "Costillas BBQ", "Costillas de cerdo bañadas en salsa BBQ ahumada", 34000)
add_topping(p, "Elote asado", 3000)
add_topping(p, "Coleslaw", 3500)

p = add_product(cat_cortes, "Picanha 300g", "Corte brasileño con grasa dorada a la parrilla", 40000, label="Premium")
add_topping(p, "Farofa", 3000)
add_topping(p, "Vinagreta brasileña", 2500)

# Acompañamientos
add_product(cat_acomp, "Papas a la Francesa", "Papas crujientes con sal marina", 8000)
add_product(cat_acomp, "Arepa con Queso", "Arepa asada con queso gratinado", 7000)
add_product(cat_acomp, "Ensalada de la Casa", "Lechuga, tomate, cebolla, aguacate", 9000)
add_product(cat_acomp, "Plátano Maduro Asado", "Plátano en su punto con queso", 6000)

# Parrilladas
add_product(cat_parrilladas, "Parrillada para 2", "Churrasco + chorizo + pollo + morcilla + acompañamientos", 72000, label="Para compartir")
add_product(cat_parrilladas, "Parrillada Familiar", "4 cortes + chorizo + pollo + morcilla + 4 acompañamientos", 130000)

# Entradas
add_product(cat_entradas3, "Chorizo Artesanal", "Chorizo santarrosano a la parrilla", 12000)
add_product(cat_entradas3, "Morcilla", "Morcilla colombiana con limón", 10000)
add_product(cat_entradas3, "Chicharrón", "Chicharrón crujiente con limón y hogao", 14000)

# Bebidas
add_product(cat_bebidas3, "Limonada de Coco", "Limonada cremosa con coco", 7000)
add_product(cat_bebidas3, "Jugo Natural de Maracuyá", "Jugo de maracuyá sin azúcar añadida", 6000)
add_product(cat_bebidas3, "Club Colombia Dorada", "Cerveza 330ml", 8000)
add_product(cat_bebidas3, "Agua Mineral", "Agua mineral con gas 600ml", 4000)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print("\n=== Datos de prueba creados ===")
print(f"  Restaurantes: {Restaurant.objects.count()}")
print(f"  Categorías: {Category.objects.count()}")
print(f"  Productos: {Product.objects.count()}")
print(f"  Toppings: {Topping.objects.count()}")
print(f"  Métodos de pago: {PaymentMethod.objects.count()}")
print(f"  Horarios: {OperatingHour.objects.count()}")
print("\n  Credenciales (todas con password: test1234):")
print(f"    burger@test.com  → {r1.name} (/{r1.slug})")
print(f"    sakura@test.com  → {r2.name} (/{r2.slug})")
print(f"    fogon@test.com   → {r3.name} (/{r3.slug})")
print()
