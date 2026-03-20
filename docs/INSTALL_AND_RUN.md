# Install And Run (Local POC)

## 1) Start services

```bash
cd /Users/siddharthasthana/Downloads/my-mobile-app
docker-compose -f docker-compose.split-poc.yml up -d
```

## 2) Verify services

```bash
docker-compose -f docker-compose.split-poc.yml ps
curl -sS http://127.0.0.1:4000/health
curl -sS http://127.0.0.1:5001/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5174
```

Expected:
- app backend health success
- admin backend health success
- admin web returns 200

## 3) API URL fallback config

File: `src/config/constants.js`

Configured order:
1. `http://192.168.29.181:4000` (LAN)
2. `http://49.36.177.206:4000` (public)
3. platform default from `src/config/apiConfig.js`

Behavior:
- app tries first URL
- retries next URL only on network/connectivity failures

## 4) Build release APK

```bash
./android/gradlew -p android assembleRelease
```

APK output:
- `android/app/build/outputs/apk/release/app-release.apk`

## 5) Wireless ADB install (no USB)

On phone:
- enable Developer options
- enable Wireless debugging
- Pair device with pairing code

On Mac:

```bash
adb kill-server
adb start-server
adb pair <PHONE_IP>:<PAIR_PORT>
adb connect <PHONE_IP>:<ADB_PORT>
adb devices -l
```

Install:

```bash
adb uninstall com.plantsolutions.mobileapp || true
adb install -r ~/Downloads/app-release-fallback.apk
```

If blocked by verifier:

```bash
adb shell settings put global verifier_verify_adb_installs 0
adb install -r ~/Downloads/app-release-fallback.apk
adb shell settings put global verifier_verify_adb_installs 1
```

## 6) Useful smoke tests

```bash
curl -sS http://127.0.0.1:4000/products | head -c 400
curl -sS http://127.0.0.1:4000/orders | head -c 600
curl -sS -H 'x-admin-token: admin123' http://127.0.0.1:5001/admin/products | head -c 400
```
