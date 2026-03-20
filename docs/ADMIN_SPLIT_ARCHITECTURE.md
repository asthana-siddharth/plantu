# Admin/App API Split Architecture

This repo now supports a split POC:

- `backend/` => mobile app APIs (customer-facing)
- `admin-backend/` => admin APIs (operations/backoffice)
- `admin-web/` => admin panel web app

## Local Run

### Option A) Full Split Stack With Docker (Recommended)

Run all services separately but from one compose:

- MySQL
- App backend (`:4000`)
- Admin backend (`:5001`)
- Admin web (`:5174`)

```bash
docker-compose -f docker-compose.split-poc.yml up -d --build
```

Health checks:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:5001/health
curl -H "x-admin-token: admin123" http://127.0.0.1:5001/admin/products
open http://127.0.0.1:5174
```

Stop:

```bash
docker-compose -f docker-compose.split-poc.yml down
```

Reset DB data:

```bash
docker-compose -f docker-compose.split-poc.yml down -v
```

### Option B) Hybrid Local (Existing)

### 1) Start MySQL + app backend containers

```bash
docker-compose -f docker-compose.local-poc.yml up -d --build
```

### 2) Start admin backend (separate process)

```bash
cd admin-backend
cp .env.example .env
npm install
npm run dev
```

Admin backend runs on `http://127.0.0.1:5001` by default.

### 3) Start admin web (separate process)

```bash
cd admin-web
cp .env.example .env
npm install
npm run dev
```

Admin panel runs on `http://127.0.0.1:5174`.

## Admin API Auth

Admin routes require `x-admin-token` header.
Default token: `admin123` (change in `.env`).

## Admin Modules Exposed

- `GET/POST/PUT /admin/products`
- `GET/PATCH /admin/inventory`
- `GET /admin/customers`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`
- `GET/POST/PUT /admin/vendors`
- `GET/POST/PUT /admin/promotions`

## Deployment Separation

Deploy app and admin APIs independently:

- App API host: `api.plantu.app` (or separate EC2/container)
- Admin API host: `api-admin.plantu.app` (or separate EC2/container)
- Admin web host: `admin.plantu.app`

Recommended minimum hardening:

- Separate environment files and secrets per service.
- Different DB users for app/admin roles.
- Keep admin API behind stricter controls (IP allow list, VPN, WAF, or SSO).
