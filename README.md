# FootStep

Plataforma que automatiza la toma de pedidos para restaurantes. Los clientes acceden al menú del restaurante mediante un link compartido por chat (Telegram/WhatsApp), realizan su pedido desde el navegador, y el restaurante lo gestiona en tiempo real desde un panel interno.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Django 5.2.x + Django REST Framework |
| Frontend | Astro 7.x + React + Nanostores |
| Base de datos | PostgreSQL 16 |
| Tiempo real | Django Channels + Redis |
| Almacenamiento | AWS S3 |
| Autenticación | JWT (Simple JWT) para restaurantes, sin auth para clientes |
| Contenedores | Docker + Docker Compose |
| Package managers | uv (Python), pnpm (Node) |
| Formateo | ruff (Python), Prettier (TS/TSX) |

## Estructura del Proyecto

```
FootStep/
├── footstep_backend/      # Django REST API
│   ├── apps/
│   │   ├── restaurants/   # Modelos Restaurant, Owner, auth JWT
│   │   ├── catalog/       # Category, Product, Topping
│   │   └── orders/        # Order, OrderItem, OrderItemTopping
│   ├── config/            # Settings, URLs, WSGI
│   ├── pyproject.toml     # Dependencias Python (uv)
│   └── Dockerfile
├── footstep_frontend/     # Astro SSR + React islands
│   ├── src/
│   │   ├── pages/         # Rutas (menú público, admin, cocina)
│   │   ├── components/    # Componentes React
│   │   ├── stores/        # Estado con nanostores
│   │   └── lib/           # API client, utilidades
│   ├── package.json       # Dependencias Node (pnpm)
│   └── Dockerfile
├── docker-compose.yml     # Orquestación local
├── init.sh                # Setup y verificación automática
└── .kiro/                 # Specs, steering, hooks
```

## Prerequisitos

- **Docker** y **Docker Compose** (para ejecución con Docker)
- **Python 3.12+** y **uv** (para ejecución sin Docker - backend)
- **Node.js 22+** y **pnpm** (para ejecución sin Docker - frontend)
- **PostgreSQL 16** (para ejecución sin Docker)

## Ejecución con Docker (Recomendado)

La forma más rápida de levantar todo el entorno:

```bash
# 1. Clonar el repositorio
git clone <repo-url> && cd FootStep

# 2. Levantar todos los servicios
docker compose up --build -d

# 3. Esperar a que PostgreSQL esté listo y ejecutar migraciones
docker compose exec backend uv run python manage.py migrate

# 4. Recopilar archivos estáticos
docker compose exec backend uv run python manage.py collectstatic --noinput

# 5. Crear un superusuario para Django Admin (opcional)
docker compose exec backend uv run python manage.py createsuperuser

# 6. Verificar que todo está corriendo
docker compose ps

#7. Popular data en la base de datos 
docker compose exec backend uv run python seed_data.py
```
Restaurante	Email	Slug	Horario
Burger Town (comida rápida)	burger@test.com	/8nr73io9	Lun-Dom 10:00-22:00
Sakura Sushi (japonés)	sakura@test.com	/sr0ail42	Mar-Dom 11:00-21:00 (lunes cerrado)
El Fogón Parrilla (parrilla)	fogon@test.com	/oe1fcynv	Mié-Dom 12:00-22:00 (lun-mar cerrado)
Password para todos: test1234


O simplemente ejecutar el script automatizado:

```bash
chmod +x init.sh
./init.sh
```

### Servicios disponibles

| Servicio | URL | Puerto |
|----------|-----|--------|
| Backend (API) | http://localhost:8000 | 8000 |
| Frontend (Astro) | http://localhost:4321 | 4321 |
| Django Admin | http://localhost:8000/admin/ | 8000 |
| PostgreSQL | localhost:5432 | 5432 |

### Comandos útiles con Docker

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend

# Reiniciar un servicio
docker compose restart backend

# Ejecutar un comando en el backend
docker compose exec backend uv run python manage.py <comando>

# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (reset de BD)
docker compose down -v
```

## Ejecución sin Docker

### 1. Base de datos

Instala y configura PostgreSQL localmente:

```bash
# Crear la base de datos
createdb footstep
createuser footstep --password  # password: footstep

# O usar psql
psql -c "CREATE USER footstep WITH PASSWORD 'footstep';"
psql -c "CREATE DATABASE footstep OWNER footstep;"
```

### 2. Backend

```bash
cd footstep_backend

# Instalar uv si no lo tienes
curl -LsSf https://astral.sh/uv/install.sh | sh

# Instalar dependencias
uv sync

# Variables de entorno (crear archivo .env o exportar)
export DJANGO_SETTINGS_MODULE=config.settings.development
export POSTGRES_DB=footstep
export POSTGRES_USER=footstep
export POSTGRES_PASSWORD=footstep
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# Ejecutar migraciones
uv run python manage.py migrate

# Recopilar archivos estáticos
uv run python manage.py collectstatic --noinput

# Crear superusuario (opcional)
uv run python manage.py createsuperuser

# Iniciar servidor de desarrollo
uv run python manage.py runserver
```

El backend estará en http://localhost:8000

### 3. Frontend

```bash
cd footstep_frontend

# Instalar pnpm si no lo tienes
npm install -g pnpm

# Instalar dependencias
pnpm install

# Variables de entorno
export PUBLIC_API_BASE=http://localhost:8000/api/v1

# Iniciar servidor de desarrollo
pnpm dev
```

El frontend estará en http://localhost:4321

## Variables de Entorno

### Backend

| Variable | Descripción | Default (dev) |
|----------|-------------|---------------|
| `DJANGO_SETTINGS_MODULE` | Módulo de settings | `config.settings.development` |
| `DJANGO_SECRET_KEY` | Clave secreta Django | `insecure-dev-key...` |
| `POSTGRES_DB` | Nombre de la BD | `footstep` |
| `POSTGRES_USER` | Usuario de BD | `footstep` |
| `POSTGRES_PASSWORD` | Contraseña de BD | `footstep` |
| `POSTGRES_HOST` | Host de BD | `localhost` |
| `POSTGRES_PORT` | Puerto de BD | `5432` |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | (vacío) |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | (vacío) |
| `AWS_STORAGE_BUCKET_NAME` | Bucket S3 | `footstep-uploads` |
| `AWS_S3_REGION_NAME` | Región S3 | `us-east-1` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS | `http://localhost:4321` |

### Frontend

| Variable | Descripción | Default (dev) |
|----------|-------------|---------------|
| `PUBLIC_API_BASE` | URL base de la API | `http://localhost:8000/api/v1` |

## API

La API está versionada bajo `/api/v1/`. Endpoints principales:

- `POST /api/v1/auth/register/` — Registro de restaurante
- `POST /api/v1/auth/token/` — Login (obtener JWT)
- `POST /api/v1/auth/token/refresh/` — Refrescar token
- `GET/PATCH /api/v1/restaurants/me/` — Perfil del restaurante
- `GET/POST/PATCH/DELETE /api/v1/catalog/categories/` — Categorías
- `GET/POST/PATCH/DELETE /api/v1/catalog/products/` — Productos
- `GET /api/v1/catalog/{slug}/menu/` — Menú público (sin auth)
- `GET/POST /api/v1/orders/` — Pedidos

## Formateo y Linting

```bash
# Backend (Python)
cd footstep_backend
uv run ruff format .
uv run ruff check .

# Frontend (TypeScript/TSX)
cd footstep_frontend
pnpm format  # si está configurado
```

## Licencia

Ver [LICENSE](LICENSE).
