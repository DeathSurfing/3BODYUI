# Development Workflow

This guide covers the development workflow for building and testing the 3 Body Payment app across all platforms.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Commands](#development-commands)
- [Desktop Development](#desktop-development)
- [Mobile Development](#mobile-development)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)

---

## Quick Start

### Prerequisites

Ensure you've completed the [SETUP.md](./SETUP.md) guide.

### Start Developing

```bash
# Navigate to project
cd 3BODYUI

# Install dependencies
cd 3bodyui && bun install

# Run desktop development
bun run tauri:dev
```

---

## Development Commands

### Available NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Run Next.js dev server only |
| `build` | `next build` | Build static export |
| `tauri:dev` | `tauri dev` | Run desktop development |
| `tauri:dev:ios` | `tauri ios dev` | Run iOS development |
| `tauri:dev:android` | `tauri android dev` | Run Android development |
| `tauri:build` | `tauri build` | Build desktop release |
| `tauri:build:ios` | `tauri ios build` | Build iOS release |
| `tauri:build:android` | `tauri android build` | Build Android release |

### Running from Project Root

```bash
# Desktop
cd 3bodyui && bun run tauri:dev

# iOS
cd 3bodyui && bun run tauri:dev:ios

# Android
cd 3bodyui && bun run tauri:dev:android
```

---

## Desktop Development

### Standard Development

```bash
cd 3bodyui
bun run tauri:dev
```

This command:
1. Starts the Next.js dev server on port 3000
2. Compiles the Rust Tauri application
3. Opens a native desktop window
4. Loads the app from the dev server
5. Enables hot-reload for both frontend and Rust code

### Window Configuration

The desktop window is configured in `src-tauri/tauri.conf.json`:

```json
{
  "windows": [{
    "title": "3 Body Payment",
    "width": 1280,
    "height": 800,
    "minWidth": 1024,
    "minHeight": 768,
    "resizable": true
  }]
}
```

### Opening DevTools

**Automatically (Debug Mode Only)**:

Edit `src-tauri/src/main.rs`:

```rust
.setup(|app| {
    #[cfg(debug_assertions)]
    {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
    }
    Ok(())
})
```

**Manually**:
- Windows/Linux: Press `Ctrl + Shift + I`
- macOS: Press `Cmd + Option + I`

### Custom Dev Server URL

If port 3000 is in use, Next.js will automatically try other ports. Update the dev URL:

```json
{
  "build": {
    "devUrl": "http://localhost:3001"
  }
}
```

---

## Mobile Development

### iOS Development

#### Simulator

```bash
cd 3bodyui
bun run tauri:dev:ios
```

This will:
1. Start the dev server on all interfaces (for mobile access)
2. Build the iOS project
3. Launch the iOS Simulator
4. Load the app

#### Physical Device

**Prerequisites**:
- macOS with Xcode
- Apple Developer account
- iOS device connected via USB
- Device registered in Apple Developer Portal

```bash
# List available devices
xcrun simctl list devices

# Run with specific device
tauri ios dev 'iPhone 15 Pro'

# Run on connected physical device
tauri ios dev --device
```

**For Physical Devices**:

The Tauri CLI will set `TAURI_DEV_HOST` to your machine's IP address. Ensure your device is on the same WiFi network.

#### Xcode Development

To open in Xcode for advanced debugging:

```bash
tauri ios build --open
```

This opens the generated Xcode project where you can:
- Set breakpoints in Swift code
- View device logs
- Profile performance
- Test on multiple simulators

### Android Development

#### Emulator

```bash
cd 3bodyui
bun run tauri:dev:android
```

This will:
1. Start the dev server
2. Build the Android project
3. Launch the Android Emulator
4. Install and run the app

**Prerequisites**:
- Android Studio installed
- Android Emulator configured (see SETUP.md)
- ANDROID_HOME environment variable set

#### Physical Device

```bash
# Verify device is connected
adb devices

# Run on connected device
tauri android dev
```

**Enable USB Debugging**:
1. Enable Developer Options (tap Build Number 7 times)
2. Enable USB Debugging
3. Connect device and accept the debugging prompt

#### Android Studio Development

To open in Android Studio:

```bash
tauri android build --open
```

This opens the Android project where you can:
- Debug Kotlin/Java code
- View logcat
- Profile with Android Profiler
- Test on different API levels

### Mobile-Specific Considerations

#### Network Configuration

For mobile development, the frontend must be accessible from the device:

```typescript
// next.config.ts
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

export default {
  assetPrefix: process.env.TAURI_DEV_HOST 
    ? `http://${process.env.TAURI_DEV_HOST}:3000`
    : undefined,
}
```

Tauri CLI automatically sets `TAURI_DEV_HOST` to your machine's local IP when running on mobile.

#### Mobile UI Testing

When developing for mobile:

1. **Use Responsive Design**: Test at multiple screen sizes
2. **Touch Targets**: Minimum 44x44 points for touch targets
3. **Safe Areas**: Respect notches, status bars, and home indicators
4. **Performance**: Test on actual devices, not just simulators

---

## Testing

### Frontend Testing

```bash
# Run Next.js tests (when implemented)
bun run test

# Run linting
bun run lint

# Type checking
bun run type-check
```

### Manual Testing Checklist

#### Desktop

- [ ] App launches successfully
- [ ] All three roles (Payee, Merchant, LP) accessible
- [ ] Wallet connection works
- [ ] Transactions can be created and executed
- [ ] Notifications display correctly
- [ ] Window resizing works properly
- [ ] Keyboard shortcuts functional

#### iOS

- [ ] App launches on simulator
- [ ] App launches on physical device
- [ ] Touch interactions responsive
- [ ] Safe areas respected (notch, home indicator)
- [ ] App handles rotation
- [ ] Push notifications work (if implemented)
- [ ] Background/foreground transitions smooth

#### Android

- [ ] App launches on emulator
- [ ] App launches on physical device
- [ ] Touch interactions responsive
- [ ] Back button navigation works
- [ ] App handles rotation
- [ ] Different screen densities render correctly
- [ ] Background/foreground transitions smooth

### Testing Native Commands

You can test Tauri commands directly:

```bash
# In Tauri CLI
tauri dev

# Then in DevTools console:
await __TAURI__.invoke('get_app_version')
```

---

## Debugging

### Frontend Debugging

**DevTools**:
- Desktop: Right-click → Inspect Element
- iOS Simulator: Safari → Develop → Simulator
- Android: Chrome → chrome://inspect

**Console Logging**:
```typescript
console.log('Debug info:', data);
console.error('Error:', error);
```

### Rust Debugging

**Logging in Rust**:
```rust
println!("Debug: {:?}", variable);
eprintln!("Error: {}", error);
```

**Using `dbg!` Macro**:
```rust
let result = dbg!(some_complex_operation());
```

**VS Code Debugging**:

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Tauri",
      "cargo": {
        "args": ["build", "--manifest-path=src-tauri/Cargo.toml"]
      },
      "preLaunchTask": "ui:build"
    }
  ]
}
```

### Mobile Debugging

#### iOS

**Safari Web Inspector**:
1. Open Safari on Mac
2. Enable Develop menu: Safari → Preferences → Advanced → Show Develop menu
3. Connect device or open simulator
4. Develop → [Device Name] → [Your App]

**Xcode Console**:
- View logs directly in Xcode
- Filter by app name or process

**Viewing Device Logs**:
```bash
# View all logs
idevicesyslog

# Filter for your app
idevicesyslog | grep "3 Body Payment"
```

#### Android

**Logcat**:
```bash
# View all logs
adb logcat

# Filter for your app
adb logcat -s "RustStdoutStderr:D"

# Filter by tag
adb logcat -s "Tauri:D"
```

**Chrome DevTools**:
1. Open Chrome on desktop
2. Navigate to `chrome://inspect`
3. Find your device and click "Inspect"

**Android Studio**:
- Open Logcat window
- Filter by package name: `package:com.threebody.protocol`

### Common Issues

**White Screen on Mobile**:
- Check that `TAURI_DEV_HOST` is set correctly
- Ensure device and dev machine are on same network
- Check DevTools console for errors

**Build Failures**:
```bash
# Clean and rebuild
cargo clean
cd 3bodyui && rm -rf dist node_modules .next
cd 3bodyui && bun install
bun run tauri:dev
```

**iOS Signing Issues**:
- Open Xcode project: `open src-tauri/gen/apple/*.xcodeproj`
- Select your team in Signing & Capabilities
- Enable "Automatically manage signing"

---

## Code Style

### TypeScript/React

**Linting**:
```bash
cd 3bodyui
bun run lint
```

**Formatting** (if using Prettier):
```bash
bun run format
```

### Rust

**Formatting**:
```bash
cd src-tauri
cargo fmt
```

**Linting**:
```bash
cd src-tauri
cargo clippy
```

### Pre-commit Hooks

Consider setting up pre-commit hooks:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
pre-commit install
```

Example `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: eslint
        name: ESLint
        entry: cd 3bodyui && bun run lint
        language: system
        files: \.(ts|tsx)$
      
      - id: cargo-fmt
        name: Rust Format
        entry: cargo fmt -- --check
        language: system
        files: \.rs$
        pass_filenames: false
```

---

## Git Workflow

### Branching Strategy

```
main
  └── develop
       ├── feature/tauri-setup
       ├── feature/secure-storage
       ├── fix/ios-notifications
       └── docs/architecture
```

### Commit Messages

Use conventional commits:

```
feat(tauri): add secure storage commands
fix(mobile): resolve iOS notification display
docs: update architecture diagram
refactor(bridge): simplify storage API
```

### Committing Changes

**Frontend Changes Only**:
```bash
cd 3bodyui
git add .
git commit -m "feat(component): add wallet connection UI"
```

**Rust Changes Only**:
```bash
git add src-tauri/
git commit -m "feat(tauri): implement secure storage"
```

**Both**:
```bash
git add .
git commit -m "feat: add secure wallet storage

- Frontend: Add wallet key input component
- Backend: Implement secure_store command
- Mobile: Test on iOS and Android"
```

### Pull Request Template

When creating PRs, include:

```markdown
## Description
Brief description of changes

## Platforms Tested
- [ ] Desktop (macOS/Windows/Linux)
- [ ] iOS Simulator
- [ ] iOS Device
- [ ] Android Emulator
- [ ] Android Device

## Changes
- Change 1
- Change 2

## Testing
Steps to test the changes

## Screenshots
If UI changes
```

---

## Best Practices

### Development

1. **Test on Real Devices**: Simulators are good, but always test on physical devices before release
2. **Feature Flags**: Use environment variables for incomplete features
3. **Error Handling**: Always handle errors gracefully in both frontend and Rust
4. **Logging**: Use appropriate log levels (debug, info, warn, error)

### Performance

1. **Lazy Loading**: Load Tauri API modules only when needed
2. **Bundle Size**: Monitor bundle size, especially for mobile
3. **Rust Optimization**: Use release builds for performance testing
4. **Image Optimization**: Use Next.js Image component with proper sizing

### Security

1. **No Hardcoded Secrets**: Use secure storage for sensitive data
2. **Input Validation**: Validate all inputs on both frontend and backend
3. **CSP Compliance**: Ensure all resources comply with Content Security Policy
4. **Permissions**: Only request necessary permissions

---

## Related Documentation

- [SETUP.md](./SETUP.md) - Environment setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [BUILD.md](./BUILD.md) - Build instructions
- [MOBILE.md](./MOBILE.md) - Mobile-specific guidelines
