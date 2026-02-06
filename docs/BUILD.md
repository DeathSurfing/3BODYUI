# Build Guide

Instructions for building production releases of the 3 Body Payment app for all platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Build Overview](#build-overview)
- [Desktop Builds](#desktop-builds)
- [Mobile Builds](#mobile-builds)
- [Build Outputs](#build-outputs)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before building, ensure:

1. **Complete Setup**: All steps from [SETUP.md](./SETUP.md) are done
2. **Code Signing**: Certificates configured (required for distribution)
3. **Version Updated**: Update version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

---

## Build Overview

### Build Commands Summary

| Platform | Command | Output |
|----------|---------|--------|
| All Desktop | `bun run tauri:build` | Platform-specific installers |
| macOS | `bun run tauri:build` | .app, .dmg |
| Windows | `bun run tauri:build` | .msi, .exe |
| Linux | `bun run tauri:build` | .deb, .rpm, .AppImage |
| iOS | `bun run tauri:build:ios` | .ipa |
| Android | `bun run tauri:build:android` | .apk, .aab |

### Build Process

1. **Frontend Build**: Next.js static export
2. **Rust Compilation**: Native binary compilation
3. **Bundle Creation**: Platform-specific packaging
4. **Code Signing**: Digital signature application

---

## Desktop Builds

### Universal Desktop Build

```bash
cd 3bodyui
bun run tauri:build
```

This builds for your current platform (macOS, Windows, or Linux).

### macOS Build

**Requirements**:
- macOS machine
- Xcode installed
- Apple Developer account (for distribution)

**Build**:
```bash
cd 3bodyui
bun run tauri:build
```

**Outputs**:
- `src-tauri/target/release/bundle/macos/3 Body Payment.app` - Unsigned app
- `src-tauri/target/release/bundle/dmg/3 Body Payment_0.0.0_x64.dmg` - DMG installer

**Code Signing** (required for distribution):

Edit `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

**Notarization** (macOS 10.15+):
```bash
# Using notarytool
xcrun notarytool submit "3 Body Payment.dmg" \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --wait
```

### Windows Build

**Requirements**:
- Windows machine or cross-compilation setup
- Visual Studio Build Tools
- Windows SDK

**Build**:
```bash
cd 3bodyui
bun run tauri:build
```

**Outputs**:
- `src-tauri/target/release/3-body-payment.exe` - Unsigned executable
- `src-tauri/target/release/bundle/msi/3 Body Payment_0.0.0_x64_en-US.msi` - MSI installer
- `src-tauri/target/release/bundle/nsis/3 Body Payment_0.0.0_x64-setup.exe` - NSIS installer

**Code Signing**:

Option 1: Certificate file
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "CERT_THUMBPRINT"
    }
  }
}
```

Option 2: EV Certificate (via environment)
```bash
set TAURI_SIGNING_PRIVATE_KEY=path/to/private-key.pfx
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=password
bun run tauri:build
```

### Linux Build

**Requirements**:
- Linux machine (or Docker container)
- Build dependencies installed

**Build**:
```bash
cd 3bodyui
bun run tauri:build
```

**Outputs**:
- `src-tauri/target/release/bundle/deb/3-body-payment_0.0.0_amd64.deb` - Debian package
- `src-tauri/target/release/bundle/rpm/3-body-payment-0.0.0-1.x86_64.rpm` - RPM package
- `src-tauri/target/release/bundle/appimage/3-body-payment_0.0.0_amd64.AppImage` - AppImage

**Distribution-Specific Notes**:

**Ubuntu/Debian**:
```bash
sudo dpkg -i 3-body-payment_0.0.0_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed
```

**Fedora/openSUSE**:
```bash
sudo rpm -i 3-body-payment-0.0.0-1.x86_64.rpm
```

**Universal (AppImage)**:
```bash
chmod +x 3-body-payment_0.0.0_amd64.AppImage
./3-body-payment_0.0.0_amd64.AppImage
```

---

## Mobile Builds

### iOS Build

**Requirements**:
- macOS machine
- Xcode 15+
- Apple Developer account
- Valid signing certificates

**Development Build** (unsigned, for testing):
```bash
cd 3bodyui
bun run tauri:build:ios
```

**Production Build** (for App Store):

1. **Configure Signing**:
Edit `src-tauri/tauri.ios.conf.json`:
```json
{
  "bundle": {
    "iOS": {
      "developmentTeam": "YOUR_TEAM_ID",
      "signingIdentity": "iPhone Distribution"
    }
  }
}
```

2. **Build Archive**:
```bash
tauri ios build --export-method app-store-connect
```

**Outputs**:
- `src-tauri/gen/apple/build/archives/*.xcarchive` - Xcode archive
- `src-tauri/gen/apple/build/outputs/*.ipa` - iOS App Store Package

**Build for TestFlight**:

Using Xcode:
1. Open `src-tauri/gen/apple/*.xcodeproj`
2. Select "Any iOS Device" as target
3. Product → Archive
4. Distribute App → App Store Connect → Upload

Using CLI:
```bash
xcodebuild -project src-tauri/gen/apple/*.xcodeproj \
  -scheme 3\ Body\ Payment_iOS \
  -destination 'generic/platform=iOS' \
  -archivePath build/3BodyPayment.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/3BodyPayment.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist exportOptions.plist
```

### Android Build

**Requirements**:
- Android Studio
- JDK 17
- Keystore for signing

**Development Build** (unsigned APK):
```bash
cd 3bodyui
bun run tauri:build:android
```

**Production Build** (signed AAB for Play Store):

1. **Create Keystore** (if not exists):
```bash
keytool -genkey -v \
  -keystore threebody-release.keystore \
  -alias threebody \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

2. **Configure Signing**:

Create `src-tauri/android/keystore.properties`:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=threebody
storeFile=../../threebody-release.keystore
```

Or use environment variables:
```bash
export ANDROID_KEYSTORE_PASSWORD=your_store_password
export ANDROID_KEY_PASSWORD=your_key_password
```

3. **Build Release AAB**:
```bash
tauri android build --aab
```

**Outputs**:
- `src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk` - Debug APK
- `src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk` - Unsigned release APK
- `src-tauri/gen/android/app/build/outputs/bundle/release/app-release.aab` - Android App Bundle (Play Store)

**Install Debug APK**:
```bash
adb install src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk
```

**Sign Release APK** (manual):
```bash
jarsigner -verbose \
  -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -keystore threebody-release.keystore \
  app-release-unsigned.apk \
  threebody

zipalign -v 4 app-release-unsigned.apk 3BodyPayment-release.apk
```

---

## Build Outputs

### Output Directory Structure

```
src-tauri/
├── target/
│   ├── release/                      # Release binaries
│   │   ├── 3-body-payment            # Linux binary
│   │   ├── 3-body-payment.exe        # Windows binary
│   │   └── bundle/                   # Installers
│   │       ├── dmg/                  # macOS DMG
│   │       ├── msi/                  # Windows MSI
│   │       ├── nsis/                 # Windows NSIS
│   │       ├── deb/                  # Debian packages
│   │       ├── rpm/                  # RPM packages
│   │       └── appimage/             # AppImage
│   │
│   └── aarch64-apple-ios/            # iOS builds
│       └── release/
│           └── 3-body-payment         # iOS binary
│
├── gen/
│   ├── android/                      # Android project
│   │   └── app/
│   │       └── build/
│   │           └── outputs/
│   │               ├── apk/
│   │               │   ├── debug/
│   │               │   └── release/
│   │               └── bundle/
│   │                   └── release/
│   │
│   └── apple/                        # iOS/macOS project
│       └── build/
│           ├── archives/             # Xcode archives
│           └── outputs/              # IPAs
```

### Bundle Formats

| Platform | Format | Best For |
|----------|--------|----------|
| macOS | .dmg | Direct distribution |
| macOS | .app | App Store (signed) |
| Windows | .msi | Enterprise deployment |
| Windows | .exe | Consumer download |
| Linux | .deb | Ubuntu/Debian |
| Linux | .rpm | Fedora/openSUSE |
| Linux | .AppImage | Universal Linux |
| iOS | .ipa | App Store/TestFlight |
| Android | .apk | Direct install |
| Android | .aab | Google Play Store |

---

## Build Configuration

### Optimizing Build Size

**Rust Optimization** (Cargo.toml):
```toml
[profile.release]
opt-level = 3      # Maximum optimization
lto = true         # Link-time optimization
strip = true       # Strip symbols
panic = "abort"    # Smaller binary size
```

**Frontend Optimization**:
```json
{
  "scripts": {
    "build": "next build && next export"
  }
}
```

### Build Targets

**Cross-compilation**:

Build for different architectures:

```bash
# macOS Universal (Intel + Apple Silicon)
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build for specific target
CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER=$(which clang) \
  cargo build --target aarch64-apple-darwin --release
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Windows signing key | `path/to/key.pfx` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password | `password123` |
| `APPLE_ID` | Apple ID for notarization | `dev@example.com` |
| `APPLE_PASSWORD` | App-specific password | `xxxx-xxxx-xxxx-xxxx` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | `keystore123` |
| `ANDROID_KEY_PASSWORD` | Key password | `key123` |

---

## Troubleshooting

### Build Failures

**"Linker not found"**:
```bash
# macOS
xcode-select --install

# Linux
sudo apt install build-essential

# Windows
# Install Visual Studio Build Tools with C++ workload
```

**"Out of memory" during Rust build**:
```bash
# Increase swap/increase memory
# Or build with fewer parallel jobs:
CARGO_BUILD_JOBS=2 cargo build --release
```

**"Code signing failed"**:
```bash
# macOS: Check certificates
security find-identity -v -p codesigning

# Windows: Check certificate thumbprint
certutil -store -user my
```

### iOS-Specific Issues

**"No signing certificate"**:
1. Open Xcode
2. Preferences → Accounts → Add Apple ID
3. Download certificates
4. Set team in project settings

**"Provisioning profile not found"**:
1. Register app ID in Apple Developer Portal
2. Create provisioning profile
3. Download and install

### Android-Specific Issues

**"Keystore not found"**:
```bash
# Verify keystore exists
keytool -list -v -keystore threebody-release.keystore
```

**"SDK not found"**:
```bash
# Verify ANDROID_HOME
echo $ANDROID_HOME

# Add to shell profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH="$ANDROID_HOME/emulator:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### Common Fixes

**Clean Build**:
```bash
# Remove all build artifacts
cargo clean
rm -rf 3bodyui/dist 3bodyui/.next
rm -rf src-tauri/target

# Rebuild
cd 3bodyui && bun install
bun run tauri:build
```

**Update Dependencies**:
```bash
# Rust
cargo update

# Node
cd 3bodyui && bun update
```

---

## Next Steps

After successful builds:

1. **Test Builds**: Install and test on clean machines
2. **Code Signing**: Ensure all binaries are signed
3. **Notarization**: macOS binaries need notarization
4. **Distribution**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Related Documentation

- [SETUP.md](./SETUP.md) - Environment setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Distribution guide
