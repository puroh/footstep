# PROGRESS.md

## Current State

**Branch:** `feat/TRA-04/maps-fix-flow`
**Date:** 2026-07-27

### Completed Modules

| Module | Status | Notes |
|--------|--------|-------|
| restaurant-admin | Done | Auth (register, JWT), profile CRUD, logo/banner upload, payment methods, catalog CRUD (categories, products, toppings), order history (list/detail) |
| client-ordering | Done | Public menu endpoint, public order creation with throttling, Telegram notification, order tracking by reference, frontend (menu page, cart, checkout flow, confirmation) |

### Partially Complete

| Module | Status | Notes |
|--------|--------|-------|
| kitchen-panel | Not started | Spec exists at `.kiro/specs/kitchen-panel/tasks.md` — all tasks pending. Requires Redis, Django Channels, WebSocket consumer, frontend page. |

### Removed from Scope

- **delivery-routing**: Not needed for this project.

## Infrastructure

- Docker Compose: PostgreSQL + backend + frontend (no Redis yet)
- Backend: Django 5.2.x + DRF + SimpleJWT + boto3 + python-telegram-bot
- Frontend: Astro 7.x SSR + React islands + nanostores
- Auth: JWT with Owner model (email-based login)

## What Was Done Last

- Completed client-ordering module (backend + frontend)
- Added order status PATCH endpoint for kitchen-panel preparation
- Created PROGRESS.md

## Next Steps

1. Kitchen Panel — implement Redis + Django Channels + WebSocket infrastructure
2. Kitchen Panel — implement `KitchenConsumer` with JWT auth
3. Kitchen Panel — broadcast helpers for order events
4. Kitchen Panel — frontend page `/kitchen/[slug]/` with React island

## Known Risks / Blockers

- None currently identified.
