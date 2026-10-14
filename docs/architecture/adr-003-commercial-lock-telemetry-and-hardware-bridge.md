# ADR-003: Commercial Lock Telemetry and Multi-Modal Hardware Bridge

## Status
Accepted

## Context
- **Problem**: 
  The property operates 123 guest suites equipped with commercial electronic door locks (Onity Trillium RFID / BLE DirectKey, OnPortal PMS integration, and Portable Programmer PP3 hardware). Maintenance staff, housekeepers, and supervisors require lock programming, clock calibration, battery monitoring, and keycard encoding. However, staff carry diverse devices across the property: front-desk PCs, rugged field laptops, iPads, and iPhones. 
  Native browser hardware APIs like Web Bluetooth (`navigator.bluetooth`) and Web Serial (`navigator.serial`) operate on desktop Chromium browsers but are strictly unsupported on iOS/iPadOS Safari and PWA webviews due to Apple WebKit platform constraints.
- **Constraints**:
  - 123 physical suites across 3 floors (Suites 101–346).
  - Multiple physical interfaces: RS-232 CommLink serial cable (PP3), 13.56 MHz MIFARE Classic/Ultralight RFID keycards, 2.4 GHz Bluetooth Low Energy (BLE), and Apple Wallet NFC.
  - High mobility: Housekeeping supervisors and maintenance engineers must service locks in the corridors using mobile iOS devices.
  - Security & Compliance: Keycard cryptographic sector keys, master lock passwords, and temporary credential tokens must never be exposed or logged in plaintext.

## Options Considered

| Option | Pros | Cons | Complexity |
|---|---|---|---|
| **Option A: Native iOS & Android Apps (React Native / Swift)** | Direct access to iOS `CoreBluetooth` and `CoreNFC` APIs; full native background hardware execution. | High maintenance burden, App Store review cycles, fragmented codebases, delayed deployment of hotel config updates. | High |
| **Option B: Desktop-Only Cart Workflow (Web Bluetooth & Web Serial)** | Simplest web implementation; relies entirely on standard browser APIs on Chrome OS / Windows laptops. | Poor operational ergonomics; staff cannot use iPhones/iPads; cart cannot easily navigate stairwells or rapid turnarounds. | Low |
| **Option C: Multi-Modal Hardware Bridge with Mobile OTA Cloud Gateway (Selected)** | Unified Next.js codebase; auto-detects host device capabilities; provides direct Web Bluetooth/Serial on desktop and Mobile Over-The-Air (OTA) Cloud Gateway + Apple Wallet on iOS/iPadOS. | Requires property-level IoT gateway or secure backend proxy for remote lock synchronization. | Medium |

## Decision
We adopt **Option C: Multi-Modal Hardware Bridge with Mobile OTA Cloud Gateway**.

1. **Hardware Abstraction Layer (HAL)**:
   - Provide a unified, vendor-agnostic `LockBridge` interface exposing standard operations: `connect()`, `syncClock()`, `encodeKey()`, `readAuditTrail()`, and `getBatteryStatus()`.
   - Implement concrete adapter strategies:
     - `WebBleLockAdapter`: Direct BLE connection via `navigator.bluetooth` for desktop Chrome and Android tablets.
     - `WebSerialLockAdapter`: Serial connection via `navigator.serial` for Onity PP3 CommLink cables.
     - `MobileOtaCloudAdapter`: Secure REST/WebSocket tunnel communicating with the property's OnPortal / IoT gateway for iOS and iPadOS devices.
2. **Device-Aware Graceful Degradation**:
   - The UI automatically inspects user-agent and feature flags (`navigator.bluetooth`, `window.isIOS`, `window.isIPad`).
   - On iOS/iPadOS devices, the station automatically transitions to **Mobile OTA Cloud Sync Mode**, displaying the property gateway channel, signal strength, and one-tap cloud sync instead of throwing unsupported Web API exceptions.
3. **Apple Wallet & Digital Key Delivery**:
   - Deliver signed `.pkpass` digital keys containing BLE payload tokens and NFC pass definitions via `/api/keys/[suite]/apple-wallet` for instant tap-to-unlock on iPhone and Apple Watch.
4. **Cryptographic Integrity & Audit Logging**:
   - Ephemeral AES-128 / AES-256 session keys generated per transaction.
   - All programming operations record cryptographic transaction hashes and technician ID into the immutable lock history aggregate.

## Rationale
- Prevents vendor lock-in and eliminates costly native app distribution cycles while giving field personnel first-class mobile tools on their existing iPhones and iPads.
- Maintains 100% operational continuity: if a supervisor is at the front desk, they use USB/Serial encoders; when in the hallways, they use their iPhone via the Mobile OTA Cloud Sync gateway.

## Consequences
- **Positive**:
  - Single responsive web application serving front desk, engineering laptops, iPads, and iPhones.
  - Zero native app installation or MDM provisioning friction for seasonal housekeeping staff.
  - Comprehensive telemetry across all 123 suites with instant visual alerts for low batteries (<4.6V) or drifted lock clocks.
- **Negative**:
  - Field iOS devices require network connectivity (property Wi-Fi or LTE) to reach the hotel OTA gateway for lock programming.
- **Mitigation**:
  - Implement service worker offline caching of suite keycard assignments and emergency offline checkout logs in IndexedDB with cryptographic timestamping.

## Revisit Trigger
- If Apple adds native Web Bluetooth / Web NFC support to WebKit, or if property upgrades to online Zigbee / Thread mesh locks that communicate autonomously without manual staff intervention.
