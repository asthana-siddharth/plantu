# Plantu Complete User Guide

## 1. Overview
Plantu is a mobile-first plant commerce and smart-care solution with:
- Customer mobile app (React Native)
- Admin panel (web)
- App backend API
- Admin backend API
- MySQL-backed data model with tax and order rules

This guide covers setup, user journeys, admin operations, deployment, APK sharing, and troubleshooting.

## 2. Components
- Mobile App: customer login, product browsing, cart, order placement, profile, services, smart care.
- Admin Web: product/inventory/tax/order management and status updates.
- App Backend (`:4000`): auth, products, services, profile, orders, devices, tax-config.
- Admin Backend (`:5001`): admin-only endpoints for order and catalog operations.

## 3. Local Run (Recommended)
From project root:

```bash
docker-compose -f docker-compose.split-poc.yml up -d --build app-backend
```

Verify:

```bash
curl -sS http://127.0.0.1:4000/health
curl -sS http://127.0.0.1:4000/tax-config
```

Expected:
- health returns `success:true`
- tax-config returns configured GST/platform/transport values

## 4. Mobile App Usage
### 4.1 Login and OTP
- Enter 10-digit mobile number.
- Tap `Send OTP`.
- Enter OTP and verify.
- API errors and timeout reasons are shown with real messages.

### 4.2 Profile
- Fill mandatory profile fields.
- Save profile.
- Profile completion is required before placing orders.

### 4.3 Shop and Cart
- Browse products and add quantities.
- Open cart for subtotal, GST split, platform fee, and delivery fee rules.
- Non-applicable rows are hidden automatically.

### 4.4 Dummy Payment and Order
- Use `Confirm Dummy Payment` to create order.
- On failures, app shows exact backend/network/timeout reason.
- If profile is incomplete, prompt offers direct navigation to Profile.

### 4.5 Orders
- `My Orders` shows list and status badges.
- `Order Details` shows products/services and charge breakdown.
- Cancel button is visible only when order status is `Placed`.
- Order detail screen auto-syncs status in background; if admin confirms order, cancel button disappears automatically without manual refresh.
- `Go to Dashboard` button is available on both `My Orders` and `Order Details` screens.

### 4.6 Services and SmartCare
- Services list loads from API.
- SmartCare device list and controls load from API.
- If API/network fails, prompt shows real reason.

## 5. Admin Panel Usage
### 5.1 Orders
- Open admin orders.
- Update order status (`Placed -> Confirmed -> Packed -> Shipped -> ...`).
- Once an order is moved from `Placed` to `Confirmed`, app-side cancel action is auto-disabled via live sync.

### 5.2 Tax Rules
- Update item/service GST, platform fee, and transportation fee from admin tax rules.
- Mobile cart/order calculations consume backend-provided config.

### 5.3 Catalog and Inventory
- Manage products/services and stock.
- Stock changes reflect in app product availability.

## 6. Network and Timeout Behavior
- App API timeout is set to 4 seconds.
- On failures/timeouts, user sees real reason (HTTP message, status, network unreachable, timeout).
- This avoids silent fallback masking and improves operational visibility.

## 7. Build and Share APK
### 7.1 Release APK (shareable)

```bash
./android/gradlew -p android assembleRelease
```

Output:
- `android/app/build/outputs/apk/release/app-release.apk`

Recommended shared copy:
- `~/Downloads/Plantu-v0.3-release.apk`

### 7.2 Install to Android

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 8. Debug Build Notes
Debug APK requires Metro:

```bash
npx react-native start --reset-cache
adb reverse tcp:8081 tcp:8081
```

If red screen says "Unable to load script", start Metro and set `adb reverse` as above.

## 9. Operational Checklist
Before sharing to testers:
- Backend health is green (`/health`).
- `/tax-config` has expected values.
- Login/OTP works for test number.
- Profile save and reload work.
- Cart totals and fees render correctly.
- Payment failure path shows exact reason.
- Admin order status change to `Confirmed` removes cancel option in app automatically.

## 10. Troubleshooting
- Orders not loading: verify backend and auth token, then check `/orders` response.
- Payment failure: read exact prompt reason and validate profile completeness.
- Slow tabs: confirm backend IP reachability and that app API candidate is correct.
- Debug red screen: Metro not running or no adb reverse.

## 11. Security and Environment Notes
- Use release APK for external sharing.
- Restrict admin token in production.
- Move from LAN URLs to secure public HTTPS endpoint for internet users.

## 12. Suggested Production Hardening
- JWT with expiry/refresh and server-side OTP.
- TLS-only API endpoints.
- Centralized error telemetry.
- Push/websocket for real-time order status instead of polling.
- CI pipeline for signed release artifacts.
