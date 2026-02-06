# Setup Guide

Complete setup instructions for developing and building the 3 Body Payment app across all supported platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [macOS Setup](#macos-setup)
- [Windows Setup](#windows-setup)
- [Linux Setup](#linux-setup)
- [iOS Development Setup](#ios-development-setup)
- [Android Development Setup](#android-development-setup)
- [Project Setup](#project-setup)
- [Verification](#verification)

---

## Prerequisites

### Required for All Platforms

1. **Node.js 18+** with npm/yarn/pnpm/bun
2. **Rust** (latest stable toolchain)
3. **Git**

### Platform-Specific Requirements

| Platform | Additional Requirements |
|----------|------------------------|
| iOS | macOS, Xcode 15+, Apple Developer Account (for device testing) |
| Android | Android Studio, JDK 17+ |
| Windows | Visual Studio Build Tools 2022 |
| macOS | Xcode Command Line Tools |
| Linux | GCC, various dev libraries |

---

## macOS Setup

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Install Xcode Command Line Tools

```bash
xcode-select --install
```

### 4. Install Node.js (using Homebrew)

```bash
brew install node
```

### 5. Install Bun (recommended)

```bash
curl -fsSL https://bun.sh/install | bash
```

### 6. Install Tauri CLI

```bash
cargo install tauri-cli --version "^2.0.0"
```

---

## Windows Setup

### 1. Install Rust

Download and run the installer from [rustup.rs](https://rustup.rs/)

Or using winget:

```powershell
winget install Rustlang.Rustup
```

### 2. Install Visual Studio Build Tools 2022

Download from [Microsoft](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and install:
- **Desktop development with C++** workload
- Or minimum: MSVC v143, Windows 10/11 SDK

### 3. Install Node.js

Download from [nodejs.org](https://nodejs.org/) or using winget:

```powershell
winget install OpenJS.NodeJS
```

### 4. Install Bun

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

### 5. Install Tauri CLI

```powershell
cargo install tauri-cli --version "^2.0.0"
```

---

## Linux Setup

### Ubuntu/Debian

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install system dependencies
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  pkg-config \
  build-essential

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

### Fedora

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install system dependencies
sudo dnf install -y \
  webkit2gtk4.1-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  patchelf \
  pkgconf-pkg-config \
  gcc

# Install Node.js
sudo dnf install -y nodejs npm

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

### Arch Linux

```bash
# Install dependencies from AUR/arch repos
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  libappindicator-gtk3 \
  librsvg \
  rustup \
  nodejs \
  npm

# Setup Rust
rustup default stable

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

---

## iOS Development Setup

### Prerequisites

- macOS machine (Xcode is macOS-only)
- Apple Developer Account (free for simulator, $99/year for device testing and App Store)

### 1. Install Xcode

Download from the Mac App Store or [Apple Developer Portal](https://developer.apple.com/download/)

### 2. Install Xcode Command Line Tools

```bash
xcode-select --install
```

### 3. Install iOS Simulator (included with Xcode)

Open Xcode → Preferences → Components → Install desired simulators

### 4. Configure for Physical Device (Optional)

1. Connect your iPhone/iPad
2. Open Xcode → Window → Devices and Simulators
3. Trust the device when prompted
4. Register device in Apple Developer Portal (for paid accounts)

### 5. Install CocoaPods (if using native dependencies)

```bash
sudo gem install cocoapods
```

---

## Android Development Setup

### 1. Install Android Studio

Download from [developer.android.com/studio](https://developer.android.com/studio)

### 2. Install SDK Components

Open Android Studio → SDK Manager and install:

- **SDK Platforms**: Android 14.0 (API 34), Android 13.0 (API 33)
- **SDK Tools**:
  - Android SDK Build-Tools 34
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools
  - Android Emulator
  - Android SDK Tools

### 3. Set Environment Variables

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=$LOCALAPPDATA\Android\Sdk # Windows

export PATH="$ANDROID_HOME/emulator:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

### 4. Install JDK 17

**macOS:**
```bash
brew install openjdk@17
```

**Linux:**
```bash
sudo apt install openjdk-17-jdk  # Ubuntu/Debian
sudo dnf install java-17-openjdk-devel  # Fedora
```

**Windows:**
Download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or use OpenJDK

### 5. Create Android Virtual Device (AVD)

Open Android Studio → Device Manager → Create Device

Recommended settings:
- Device: Pixel 7
- System Image: Android 14.0 (API 34)
- Architecture: x86_64

### 6. Enable USB Debugging (Physical Device)

1. Enable Developer Options: Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging: Settings → System → Developer Options → USB Debugging
3. Connect device and accept debugging prompt

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 3BODYUI
```

### 2. Install Frontend Dependencies

```bash
cd 3bodyui
bun install
```

### 3. Verify Tauri Installation

```bash
tauri --version
```

Expected output: `tauri-cli 2.x.x`

### 4. Initialize Mobile Platforms (First Time Only)

```bash
# Initialize iOS project
tauri ios init

# Initialize Android project
tauri android init
```

---

## Verification

### Test Desktop Development

```bash
cd 3bodyui
bun run tauri:dev
```

Expected: Desktop app window opens with your app

### Test iOS Simulator

```bash
cd 3bodyui
bun run tauri:dev:ios
```

Expected: iOS Simulator launches with your app

### Test Android Emulator

```bash
cd 3bodyui
bun run tauri:dev:android
```

Expected: Android Emulator launches with your app

---

## Troubleshooting

### Common Issues

**"tauri: command not found"**
```bash
# Ensure cargo bin is in PATH
export PATH="$HOME/.cargo/bin:$PATH"
```

**"No such file or directory" on Linux**
```bash
# Install missing webkit dependency
sudo apt install libwebkit2gtk-4.1-dev  # Ubuntu/Debian
```

**iOS Simulator not found**
```bash
# List available simulators
xcrun simctl list devices

# Run with specific device
tauri ios dev 'iPhone 15'
```

**Android device not detected**
```bash
# Check connected devices
adb devices

# Restart ADB server
adb kill-server
adb start-server
```

---

## Next Steps

Once setup is complete:

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development workflow
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
3. Read [MOBILE.md](./MOBILE.md) for mobile-specific guidelines

For build and deployment instructions, see [BUILD.md](./BUILD.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
