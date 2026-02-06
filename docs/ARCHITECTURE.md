# System Architecture

This document describes the architecture of the 3 Body Payment Tauri application, including the relationship between the frontend, native bridge, and platform layers.

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Layers](#component-layers)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Platform Abstraction](#platform-abstraction)
- [Technology Stack](#technology-stack)

---

## Overview

The 3 Body Payment app is built using a **multi-layered architecture** that combines:

- **Frontend**: Next.js 16 + React 19 (TypeScript)
- **Native Bridge**: Tauri v2 (Rust)
- **Platform Layer**: iOS, Android, Windows, macOS, Linux

This architecture allows us to write the application UI once in React and deploy it natively across all platforms while accessing native platform capabilities through a secure Rust bridge.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Payee       │  │  Merchant    │  │  Liquidity   │       │
│  │  Dashboard   │  │  Dashboard   │  │  Provider    │       │
│  │              │  │              │  │  Dashboard   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React Components (UI)                   │    │
│  │  • Role Selection • Wallet Connection • Transactions │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Next.js 16 (Static Export)             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │    │
│  │  │  App Router  │  │  API Routes  │  │  Static  │   │    │
│  │  │  (Pages)     │  │  (Server)    │  │  Assets  │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Tauri JavaScript Bridge                 │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │    │
│  │  │  secure    │ │  notifications│ │  external    │   │    │
│  │  │  storage   │ │              │ │  shell       │   │    │
│  │  └────────────┘ └────────────┘ └────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    NATIVE BRIDGE LAYER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Tauri v2 Runtime (Rust)                │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │           Command Handlers                    │   │    │
│  │  │  • secure_store()    • show_notification()    │   │    │
│  │  │  • secure_retrieve() • open_external_url()    │   │    │
│  │  │  • secure_delete()   • get_app_version()      │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │              Tauri Plugins                    │   │    │
│  │  │  • shell        • fs           • os          │   │    │
│  │  │  • notification • updater                     │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │          WebView Controller                   │   │    │
│  │  │  WKWebView (iOS) / WebView2 (Win) / etc.     │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    PLATFORM LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Native Platform APIs                    │    │
│  │                                                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │    │
│  │  │  iOS     │ │  Android │ │ Windows  │ │  macOS │ │    │
│  │  │ Keychain │ │ Keystore │ │CredMgr   │ │Keychain│ │    │
│  │  │ UIKit    │ │  SDK     │ │Win32     │ │ AppKit │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────┐                                        │    │
│  │  │  Linux   │                                        │    │
│  │  │SecretSvc │                                        │    │
│  │  │  GTK     │                                        │    │
│  │  └──────────┘                                        │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Layers

### 1. User Interface Layer

**Location**: `3bodyui/components/`, `3bodyui/app/`

The presentation layer built with React and Tailwind CSS:

- **Role-Based Dashboards**: Payee, Merchant, Liquidity Provider interfaces
- **Shared Components**: Navigation, wallet connection, loaders
- **Protocol Visualizer**: Visual representation of the settlement flow
- **Responsive Design**: Works on mobile and desktop form factors

**Key Technologies**:
- React 19
- Next.js 16 App Router
- Tailwind CSS 4
- TypeScript 5.8

### 2. Frontend Layer

**Location**: `3bodyui/`

The Next.js application configured for static export:

#### Static Export Configuration
```typescript
// next.config.ts
{
  output: 'export',      // Required for Tauri
  distDir: 'dist',       // Output directory
  images: { unoptimized: true }
}
```

#### Tauri JavaScript Bridge

**Location**: `3bodyui/lib/tauri/`

Type-safe wrappers around Tauri's native APIs:

| Module | Purpose | Example Use |
|--------|---------|-------------|
| `storage.ts` | Secure key-value storage | Wallet credentials |
| `notifications.ts` | Native notifications | Transaction updates |
| `app.ts` | App metadata | Version checking |
| `shell.ts` | External URL handling | Open blockchain explorer |

### 3. Native Bridge Layer

**Location**: `src-tauri/`

The Rust-based Tauri runtime that bridges web technologies to native APIs:

#### Command System

Rust functions exposed to JavaScript via Tauri's command system:

```rust
#[tauri::command]
pub async fn secure_store(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    // Platform-specific secure storage implementation
}
```

**Flow**:
1. JavaScript calls `invoke('secure_store', { key, value })`
2. Tauri serializes the request
3. Rust command handler executes
4. Result is serialized back to JavaScript

#### Plugin Architecture

Tauri v2 uses a plugin system for extended functionality:

| Plugin | Purpose | Platforms |
|--------|---------|-----------|
| `shell` | Open external URLs | All |
| `notification` | System notifications | All |
| `fs` | File system access | All |
| `os` | OS information | All |
| `updater` | Auto-updates | Desktop |

### 4. Platform Layer

Platform-specific implementations that Tauri abstracts:

#### Secure Storage Implementation

| Platform | Native API | Security Level |
|----------|-----------|----------------|
| iOS | Keychain Services | Hardware-backed |
| Android | Android Keystore | Hardware-backed (TEE) |
| macOS | Keychain | Hardware-backed |
| Windows | Credential Manager / DPAPI | OS-protected |
| Linux | Secret Service API / libsecret | Session-based |

#### WebView Implementation

| Platform | WebView Engine | Version |
|----------|---------------|---------|
| iOS | WKWebView | System |
| Android | WebView | System |
| Windows | WebView2 (Edge) | Bundled |
| macOS | WKWebView | System |
| Linux | WebKitGTK | Bundled |

---

## Data Flow

### Example: Secure Storage Operation

```
User Action
    ↓
React Component (e.g., WalletButton)
    ↓
secureStorage.set(key, value)  [lib/tauri/storage.ts]
    ↓
invoke('secure_store', { key, value })  [@tauri-apps/api]
    ↓
Tauri IPC Bridge  (JSON serialization)
    ↓
secure_store command  [src-tauri/src/lib.rs]
    ↓
Platform-specific storage:
  • iOS: SecItemAdd (Keychain)
  • Android: Keystore.setEntry
  • Windows: CredWrite
  • macOS: SecItemAdd (Keychain)
  • Linux: secret_password_store_sync
    ↓
Result (success/failure)
    ↓
Promise resolution in JavaScript
```

### Example: Notification Display

```
Transaction Status Update
    ↓
React Component
    ↓
notifications.show(title, body)  [lib/tauri/notifications.ts]
    ↓
invoke('show_notification', { title, body })
    ↓
Tauri notification plugin
    ↓
Platform-specific notification:
  • iOS: UNUserNotificationCenter
  • Android: NotificationManager
  • Desktop: System notification APIs
    ↓
Notification displayed to user
```

---

## Security Architecture

### Content Security Policy (CSP)

```json
{
  "csp": {
    "default-src": "'self'",
    "connect-src": "'self' ipc: http://ipc.localhost https:",
    "img-src": "'self' data: https:",
    "style-src": "'self' 'unsafe-inline'",
    "script-src": "'self' 'wasm-unsafe-eval'"
  }
}
```

**Principles**:
- **Self-only resources**: No external scripts/styles
- **IPC isolation**: Internal communication only via Tauri's IPC
- **Eval disabled**: No arbitrary code execution
- **HTTPS enforcement**: External connections must be secure

### Permission System

Capabilities define what the app can access:

```json
{
  "identifier": "default",
  "permissions": [
    "core:default",
    "shell:allow-open",
    "notification:default",
    "fs:allow-read-file",
    "fs:allow-write-file"
  ]
}
```

**Principle of Least Privilege**: Only request permissions that are actually needed.

### Secure Storage

Sensitive data (wallet keys, auth tokens) uses platform-native encryption:

- **Encryption**: Handled by OS-level secure storage
- **Key Management**: Platform key management (no app-managed keys)
- **Access Control**: App-specific access, user authentication required for some platforms

---

## Platform Abstraction

### WebView Abstraction

Tauri abstracts WebView differences:

```rust
// Same JavaScript API works on all platforms
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        secure_store,
        show_notification,
    ])
```

### Native API Abstraction

Platform differences are handled in Rust:

```rust
#[cfg(target_os = "ios")]
use ios_specific_lib;

#[cfg(target_os = "android")]
use android_specific_lib;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use desktop_specific_lib;
```

### Conditional Compilation

Rust's conditional compilation ensures only relevant code is compiled:

```rust
// Desktop-only updater
#[cfg(not(any(target_os = "android", target_os = "ios")))]
.plugin(tauri_plugin_updater::init())

// Mobile-specific code
#[cfg(any(target_os = "android", target_os = "ios"))]
mod mobile;
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework, static export |
| React | 19.2.4 | UI library |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 4.1.18 | Styling |
| Bun | Latest | Package manager, runtime |

### Native Bridge

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | 2.0 | Native bridge framework |
| Rust | 1.77+ | Native code |
| Cargo | Latest | Rust package manager |

### Platform Targets

| Platform | Minimum Version | Target Architecture |
|----------|----------------|---------------------|
| iOS | 14.0 | arm64, x86_64 (sim) |
| Android | API 24 (7.0) | arm64-v8a, x86_64 |
| Windows | 10 | x86_64 |
| macOS | 10.13 | x86_64, arm64 |
| Linux | Ubuntu 20.04+ | x86_64 |

---

## Directory Structure

```
3BODYUI/
├── 3bodyui/                    # Next.js frontend
│   ├── app/                    # App router pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities
│   │   └── tauri/              # Tauri bridge modules
│   ├── public/                 # Static assets
│   ├── next.config.ts          # Next.js config (Tauri-ready)
│   └── package.json            # Dependencies
│
├── src-tauri/                  # Rust native code
│   ├── src/                    # Rust source
│   │   ├── lib.rs              # Library + commands
│   │   ├── main.rs             # Desktop entry
│   │   └── mobile.rs           # Mobile-specific
│   ├── capabilities/           # Permission definitions
│   ├── icons/                  # App icons
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Main Tauri config
│   ├── tauri.ios.conf.json     # iOS overrides
│   └── tauri.android.conf.json # Android overrides
│
└── docs/                       # Documentation
    ├── SETUP.md
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT.md
    ├── BUILD.md
    ├── DEPLOYMENT.md
    ├── MOBILE.md
    └── SECURITY.md
```

---

## Related Documentation

- [SETUP.md](./SETUP.md) - Environment setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [SECURITY.md](./SECURITY.md) - Security best practices
- [MOBILE.md](./MOBILE.md) - Mobile-specific guidelines
