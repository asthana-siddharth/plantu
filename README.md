# Plantu Mobile App

Plantu is a React Native mobile app with a Node.js backend for plant shopping, smart irrigation/device control, and order management.

## Tech Stack

- Mobile: React Native (`0.71`), React Navigation, Axios
- Backend: Node.js, Express
- Data: MySQL primary (write), MySQL secondary (read)
- Search/Read Model: Elasticsearch (orders)
- Local Infra: Docker Compose

## Core Features

- Phone OTP based auth flow (dev OTP)
- Product listing, search, and product detail
- Cart management and checkout
- Order creation and order history
- IoT device state controls (on/off + device patching)
- Service booking and profile flows in app navigation

## Monorepo Structure

```text
.
|- src/                         # React Native app source
|  |- config/                  # API + constants + theme
|  |- context/                 # Auth, cart, device state
|  |- navigation/              # Root/auth/tab navigators
|  |- screens/                 # Feature screens
|  |- services/                # API service wrappers
|- backend/
|  |- src/                     # Express server + db/search modules
|  |- mysql/                   # MySQL replication config/init scripts
|  |- .env.example             # Backend environment template
|- android/                    # Native Android project
|- ios/                        # Native iOS project
|- docker-compose.yml          # Local MySQL + Elasticsearch stack
```

## Prerequisites

- Node.js 18+ and npm
- React Native Android/iOS toolchain
- Java + Android SDK (for Android builds)
- Xcode + CocoaPods (for iOS builds)
- Docker Desktop (required for local MySQL + Elasticsearch stack)

## Setup

1. Install root dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
cd backend
npm install
cd ..
```

## Running The Mobile App

Start Metro from repo root:

```bash
npx react-native start
```

Run Android:

```bash
npx react-native run-android
```

Run iOS:

```bash
npx react-native run-ios
```

## Running Backend + Data Stack

1. Start local dependencies from project root:

```bash
docker compose up -d
```

2. Create backend env from template:

```bash
cd backend
cp .env.example .env
```

3. Start backend:

```bash
cd backend
npm run start
```

Backend default URL: `http://localhost:4000`

Note: `npm run start` must be run inside `backend/` because root `package.json` does not define a `start` script.

## Backend Environment Variables

Main variables from `backend/.env.example`:

- `PORT`: backend port (default `4000`)
- `DB_PRIMARY_*`: MySQL write node (default `127.0.0.1:3307`)
- `DB_SECONDARY_*`: MySQL read node (default `127.0.0.1:3308`)
- `ELASTIC_NODE`: Elasticsearch URL (default `http://127.0.0.1:9200`)
- `ELASTIC_ORDER_INDEX`: order index name (default `orders`)

## API Reference

Base URL: `http://localhost:4000`

Response envelope:

- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "message": "..." }`

### Health

- `GET /health`: service heartbeat and architecture mode
- `GET /health/dependencies`: checks MySQL primary, MySQL secondary, Elasticsearch

### Auth

- `POST /auth/send-otp`
  - Body: `{ "phone": "9999999999" }`
- `POST /auth/resend-otp`
  - Body: `{ "phone": "9999999999" }`
- `POST /auth/verify-otp`
  - Body: `{ "phone": "9999999999", "otp": "1111" }`

### Products

- `GET /products`
  - Query: `category`, `search`
- `GET /products/:id`

### Devices

- `GET /devices`
- `POST /devices/:id/state`
  - Body: `{ "on": true }`
- `PATCH /devices/:id`
  - Body: partial fields like `{ "name": "Pump", "isOn": false, "moisture": 42 }`

### Orders

- `GET /orders` (served from Elasticsearch)
- `GET /orders/:id` (served from Elasticsearch)
- `POST /orders`
  - Body: `{ "items": [{ "quantity": 1, "product": { "name": "Aloe", "price": 199 } }] }`
  - Write path: MySQL primary + Elasticsearch (dual write)

## Architecture Notes

- Writes use MySQL primary.
- Reads use MySQL secondary where applicable (`products`, `devices`).
- Orders are indexed in Elasticsearch and read from Elasticsearch.
- On backend startup, if the order index is empty, orders are backfilled from MySQL primary.

## Mobile API Connectivity

`src/config/apiConfig.js` chooses host by platform:

- iOS simulator: `localhost`
- Android emulator: `10.0.2.2`

This points the app to backend `:4000` by default.

## Tests

Run tests from repo root:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

## Troubleshooting

- Docker command not found:
  - Install/start Docker Desktop, then run `docker compose up -d` again.
- Backend start fails from repo root:
  - Run from `backend/` using `cd backend && npm run start`.
- Android app cannot call backend:
  - Confirm backend runs on `4000` and emulator uses `10.0.2.2` mapping.
- Dependency health fails:
  - Check `curl http://localhost:4000/health/dependencies` and container status using `docker compose ps`.

## Useful Commands

From repo root:

```bash
docker compose up -d
docker compose down
npx react-native start
npx react-native run-android
```

From `backend/`:

```bash
npm run start
npm run dev
```

## Deployment

- AWS Free Tier deployment guide: `docs/AWS_FREE_TIER_DEPLOYMENT.md`