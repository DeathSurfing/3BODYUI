# 3 Body Payment

A decentralized tri-party settlement protocol enabling secure USD to USDT exchanges through smart contracts.

[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://github.com/yourusername/3BODYUI)
[![Tech Stack](https://img.shields.io/badge/stack-Next.js%2016%20%7C%20React%2019%20%7C%20Tauri%20v2%20%7C%20Rust-orange)](https://github.com/yourusername/3BODYUI)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

3 Body Payment is a cross-platform DeFi application built with modern web technologies and compiled to native applications using Tauri v2. The app supports five platforms from a single codebase:

- 📱 iOS (iPhone/iPad)
- 🤖 Android
- 🖥️ macOS
- 🪟 Windows
- 🐧 Linux

## Architecture

This project uses a **multi-layered architecture**:

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19)       │
│  TypeScript • Tailwind CSS • Web UI     │
├─────────────────────────────────────────┤
│  Tauri Bridge (JavaScript/TypeScript)   │
│  Secure Storage • Notifications • Shell │
├─────────────────────────────────────────┤
│  Native Runtime (Tauri v2 + Rust)       │
│  Platform APIs • Secure Storage • IPC   │
├─────────────────────────────────────────┤
│  Platform Layer (iOS/Android/Desktop)   │
│  Native OS APIs • Keychain • Keystore   │
└─────────────────────────────────────────┘
```

### Key Technologies

- **Frontend**: Next.js 16, React 19, TypeScript 5.8, Tailwind CSS 4
- **Native Bridge**: Tauri v2 (Rust)
- **Build System**: Cargo (Rust), Bun (Node.js)
- **Platforms**: iOS, Android, Windows, macOS, Linux

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ with npm/yarn/pnpm/bun
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific tools (Xcode for iOS, Android Studio for Android)

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd 3BODYUI

# Install frontend dependencies
cd 3bodyui
bun install

# Run desktop development
bun run tauri:dev
```

### Development Commands

```bash
# Desktop (macOS/Windows/Linux)
bun run tauri:dev

# iOS Simulator
bun run tauri:dev:ios

# Android Emulator
bun run tauri:dev:android

# Build for production
bun run tauri:build           # Desktop
bun run tauri:build:ios       # iOS
bun run tauri:build:android   # Android
```

## Project Structure

```
3BODYUI/
├── 3bodyui/                    # Next.js frontend application
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   │   ├── roles/              # Role-specific dashboards
│   │   │   ├── payee/
│   │   │   ├── merchant/
│   │   │   └── liquidityProvider/
│   │   ├── layout/             # Layout components
│   │   └── loader/             # Loading components
│   ├── lib/                    # Utility functions
│   │   ├── tauri/              # Tauri bridge APIs
│   │   │   ├── index.ts        # Main exports
│   │   │   ├── storage.ts      # Secure storage
│   │   │   ├── notifications.ts
│   │   │   ├── app.ts
│   │   │   └── shell.ts
│   │   └── services/           # Business logic
│   ├── public/                 # Static assets
│   ├── next.config.ts          # Next.js configuration
│   └── package.json            # Frontend dependencies
│
├── src-tauri/                  # Rust Tauri application
│   ├── src/                    # Rust source code
│   │   ├── lib.rs              # Library with Tauri commands
│   │   └── main.rs             # Desktop entry point
│   ├── capabilities/           # Permission definitions
│   ├── icons/                  # App icons
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Main Tauri configuration
│   ├── tauri.ios.conf.json     # iOS-specific config
│   └── tauri.android.conf.json # Android-specific config
│
├── docs/                       # Documentation
│   ├── SETUP.md                # Environment setup
│   ├── ARCHITECTURE.md         # System architecture
│   ├── DEVELOPMENT.md          # Development workflow
│   ├── BUILD.md                # Build instructions
│   ├── DEPLOYMENT.md           # Distribution guide
│   ├── MOBILE.md               # Mobile-specific guidelines
│   └── SECURITY.md             # Security best practices
│
└── smartcontract/              # Smart contracts (Rust)
    ├── escrow/
    └── lp_registry/
```

## Features

### User Roles

- **Payee**: Initiate USD to USDT swaps with smart-contract verified settlement
- **Merchant**: Monitor system flow, manage protocol fees, oversee transactions
- **Liquidity Provider**: Supply USDT liquidity and earn protocol fees

### Native Capabilities

- 🔐 **Secure Storage**: Platform-native encrypted storage for wallet keys
- 🔔 **Notifications**: Native push notifications for transaction updates
- 🌐 **External Links**: Safe browser opening for blockchain explorers
- 📱 **Mobile Optimized**: Responsive design for all screen sizes

### Technical Features

- Static site generation for optimal performance
- Type-safe Tauri command bridge
- Platform-specific configurations
- Comprehensive error handling
- Hot reload in development
- Auto-updater support (desktop)

## Documentation

- **[SETUP.md](docs/SETUP.md)** - Complete environment setup for all platforms
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Development workflow and debugging
- **[BUILD.md](docs/BUILD.md)** - Building production releases
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - App store distribution guide
- **[MOBILE.md](docs/MOBILE.md)** - Mobile-specific development guidelines
- **[SECURITY.md](docs/SECURITY.md)** - Security considerations and best practices

## Development

### Frontend Development

The frontend is a standard Next.js application with some Tauri-specific configurations:

```typescript
// Using Tauri APIs
import { secureStorage, notifications } from '@/lib/tauri';

// Store sensitive data securely
await secureStorage.set('wallet_key', encryptedKey);

// Show native notification
await notifications.show('Transaction Complete', 'Your swap was successful!');
```

### Native Commands

Rust commands are defined in `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
pub async fn secure_store(
    key: String,
    value: String,
) -> Result<(), String> {
    // Implementation for secure storage
    Ok(())
}
```

And invoked from the frontend:

```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('secure_store', { key: 'test', value: 'value' });
```

### Code Style

- **TypeScript/React**: ESLint with Next.js config
- **Rust**: `cargo fmt` and `cargo clippy`
- **Commits**: Conventional commits format

## Building

### Desktop

```bash
cd 3bodyui
bun run tauri:build
```

Outputs:
- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`
- Linux: `.deb`, `.rpm`, `.AppImage`

### iOS

```bash
# For App Store distribution
bun run tauri:build:ios

# Or open in Xcode for signing
bun run tauri:build:ios --open
```

### Android

```bash
# Debug APK
bun run tauri:build:android

# Release AAB for Play Store
tauri android build --aab
```

See [BUILD.md](docs/BUILD.md) for detailed build instructions.

## Deployment

### App Stores

- **iOS**: App Store via App Store Connect
- **Android**: Google Play Store
- **macOS**: Mac App Store or direct distribution
- **Windows**: Microsoft Store or direct download

### Direct Distribution

- **macOS**: Signed DMG with notarization
- **Windows**: Signed MSI/NSIS installer
- **Linux**: Package repositories (PPA, COPR, AUR)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete distribution guide.

## Security

Security is critical for a DeFi application. Key security features:

- 🔐 Platform-native secure storage (Keychain, Keystore)
- 🛡️ Content Security Policy (CSP) enforcement
- ✅ Code signing on all platforms
- 🔒 HTTPS-only network requests
- 🚫 No eval() or inline scripts

See [SECURITY.md](docs/SECURITY.md) for detailed security guidelines.

## Roadmap

- [x] Tauri v2 setup and configuration
- [x] Cross-platform build system
- [x] Native API bridge
- [x] Comprehensive documentation
- [ ] Full secure storage implementation
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Auto-updater configuration
- [ ] Hardware wallet integration
- [ ] Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow conventional commits format
- Test on multiple platforms when possible
- Update documentation for new features
- Ensure security best practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Native app framework
- [Next.js](https://nextjs.org/) - React framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Support

- 📧 Email: support@threebody.protocol
- 💬 Discord: [Join our server](https://discord.gg/threebody)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/3BODYUI/issues)

---

**Built with ❤️ by the Three Body Protocol Team**