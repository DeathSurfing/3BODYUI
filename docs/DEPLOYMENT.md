# Deployment Guide

Instructions for distributing the 3 Body Payment app through various channels including app stores and direct distribution.

## Table of Contents

- [Overview](#overview)
- [Apple App Store](#apple-app-store)
- [Google Play Store](#google-play-store)
- [Desktop Distribution](#desktop-distribution)
- [Beta Testing](#beta-testing)
- [Auto-Updates](#auto-updates)
- [Security Checklist](#security-checklist)

---

## Overview

### Distribution Channels

| Platform | Channel | Best For |
|----------|---------|----------|
| iOS | App Store | Mass distribution |
| iOS | TestFlight | Beta testing |
| Android | Google Play | Mass distribution |
| Android | Direct APK | Internal/testing |
| macOS | App Store | Mass distribution |
| macOS | Direct DMG | Power users, enterprise |
| Windows | Microsoft Store | Mass distribution |
| Windows | Direct download | Enterprise, power users |
| Linux | Package managers | Linux users |
| Linux | AppImage | Universal distribution |

### Prerequisites

Before deployment:

1. ✅ All builds tested on clean devices
2. ✅ Code signing certificates configured
3. ✅ App Store accounts created and configured
4. ✅ Privacy policy and terms of service prepared
5. ✅ App metadata (screenshots, descriptions) ready
6. ✅ App icons in all required sizes

---

## Apple App Store

### Prerequisites

- **Apple Developer Program**: $99/year
- **Apple ID with 2FA enabled**
- **Valid signing certificates**
- **macOS machine** (required for upload)

### App Store Connect Setup

1. **Create App Record**:
   - Visit [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps → + → New App
   - Fill in:
     - Platform: iOS
     - Name: 3 Body Payment
     - Primary Language: English
     - Bundle ID: com.threebody.protocol
     - SKU: threebody-001

2. **Configure App Information**:
   - App Privacy: Provide privacy details
   - Pricing: Free or set price
   - Availability: Select regions
   - App Review Information: Contact info

### Build and Upload

**Option 1: Xcode (Recommended)**

```bash
# Open project
tauri ios build --open

# In Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Destination → Any iOS Device
# 3. Product → Archive
# 4. Window → Organizer
# 5. Select archive → Distribute App
# 6. App Store Connect → Upload
```

**Option 2: Transporter App**

1. Build IPA:
```bash
tauri ios build
```

2. Download [Transporter](https://apps.apple.com/us/app/transporter/id1450874784) from Mac App Store

3. Drag IPA to Transporter and deliver

**Option 3: altool (CLI)**

```bash
xcrun altool --upload-app \
  --type ios \
  --file "3 Body Payment.ipa" \
  --apiKey "YOUR_API_KEY" \
  --apiIssuer "YOUR_ISSUER_ID"
```

### App Review

**Preparation**:
- Test on real devices (not just simulators)
- Ensure no crashes or major bugs
- Test all three roles (Payee, Merchant, LP)
- Verify blockchain integration works
- Check for memory leaks

**Required for Review**:
- Demo account credentials (if applicable)
- Test wallet addresses
- Video showing app functionality (optional but helpful)
- Explanation of blockchain functionality

**Common Rejection Reasons**:
- ❌ Crashes or bugs
- ❌ Incomplete functionality
- ❌ Misleading description
- ❌ Missing privacy policy
- ❌ Payment outside of App Store (for digital goods)
- ✅ Our app uses blockchain for payments, not Apple's IAP

**Review Timeline**: 24-48 hours typically, up to 7 days

---

## Google Play Store

### Prerequisites

- **Google Play Developer Account**: $25 one-time fee
- **Google Account**
- **Signed release AAB**
- **Privacy policy URL**

### Google Play Console Setup

1. **Create App**:
   - Visit [Play Console](https://play.google.com/console)
   - Create app
   - Fill in:
     - App name: 3 Body Payment
     - Default language: English
     - App or game: App
     - Free or paid: Choose

2. **Store Listing**:
   - App description (short and full)
   - Screenshots (phone, tablet, Android TV)
   - Feature graphic (1024x500)
   - App icon (512x512)

3. **Content Rating**:
   - Complete questionnaire
   - Expected: Everyone or Teen (financial app)

4. **App Content**:
   - Privacy policy (required)
   - Ads: No
   - App access: All functionality available

### Build and Upload

**Build Signed AAB**:

```bash
# Ensure keystore is configured
# See BUILD.md for keystore setup

# Build release AAB
cd 3bodyui
tauri android build --aab
```

**Upload to Play Console**:

1. Go to [Play Console](https://play.google.com/console)
2. Select your app
3. Production → Create new release
4. Upload AAB file
5. Review release notes
6. Save and publish

**Release Tracks**:

| Track | Purpose | Audience |
|-------|---------|----------|
| Internal testing | Immediate testing | Up to 100 testers |
| Closed testing | Beta testing | Selected testers |
| Open testing | Public beta | Anyone can join |
| Production | Full release | All users |

### App Review

**Play Store Review**: Usually automated, can take hours to days

**Compliance**:
- Financial apps have additional scrutiny
- Ensure clear description of blockchain usage
- Provide contact information
- No misleading claims

---

## Desktop Distribution

### macOS Distribution

**App Store**:
- Same process as iOS
- Must use App Sandbox (restrictive)
- Review process similar to iOS

**Direct Distribution (Recommended for DeFi)**:

1. **Build Signed App**:
```bash
cd 3bodyui
bun run tauri:build
```

2. **Create DMG**:
```bash
# Already created by Tauri
# src-tauri/target/release/bundle/dmg/
```

3. **Notarize** (macOS 10.15+):
```bash
xcrun notarytool submit "3 Body Payment.dmg" \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --wait

# Staple ticket to DMG
xcrun stapler staple "3 Body Payment.dmg"
```

4. **Distribution Options**:
   - Direct download from website
   - GitHub Releases
   - Homebrew Cask
   - Sparkle (auto-updates)

**Homebrew Cask Example**:

Create `three-body-payment.rb`:
```ruby
cask "three-body-payment" do
  version "0.0.0"
  sha256 "SHA256_HASH"

  url "https://github.com/yourname/3BODYUI/releases/download/v#{version}/3.Body.Payment.dmg"
  name "3 Body Payment"
  desc "Decentralized tri-party settlement protocol"
  homepage "https://threebody.protocol"

  app "3 Body Payment.app"
end
```

### Windows Distribution

**Microsoft Store**:
- Create developer account
- Package as MSIX (Tauri does this automatically)
- Submit through Partner Center

**Direct Distribution**:

1. **Build**:
```bash
cd 3bodyui
bun run tauri:build
```

2. **Sign with EV Certificate** (recommended):
```bash
# Use environment variables
set TAURI_SIGNING_PRIVATE_KEY=key.pfx
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=pass
bun run tauri:build
```

3. **Distribution Options**:
   - Direct download (.exe installer)
   - GitHub Releases
   - Winget
   - Chocolatey
   - Scoop

**Winget Manifest Example**:

Create `threebody.threebodypayment.yaml`:
```yaml
PackageIdentifier: ThreeBody.ThreeBodyPayment
PackageVersion: 0.0.0
PackageName: 3 Body Payment
Publisher: Three Body Protocol
License: MIT
InstallerType: nullsoft
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/yourname/3BODYUI/releases/download/v0.0.0/3.Body.Payment_0.0.0_x64-setup.exe
    InstallerSha256: SHA256_HASH
ManifestType: singleton
ManifestVersion: 1.0.0
```

### Linux Distribution

**Package Repositories**:

**Ubuntu/Debian PPA**:
```bash
# Create PPA on Launchpad
# Upload source package
# Users add: sudo add-apt-repository ppa:yourname/threebody
```

**Fedora COPR**:
```bash
# Create project on COPR
# Submit spec file
# Users add: sudo dnf copr enable yourname/threebody
```

**Arch AUR**:

Create `PKGBUILD`:
```bash
# Maintainer: Your Name <you@example.com>
pkgname=three-body-payment
pkgver=0.0.0
pkgrel=1
pkgdesc="Decentralized tri-party settlement protocol"
arch=('x86_64')
url="https://threebody.protocol"
license=('MIT')
source=("$pkgname-$pkgver.AppImage::https://github.com/yourname/3BODYUI/releases/download/v$pkgver/3-body-payment_${pkgver}_amd64.AppImage")
sha256sums=('SKIP')

package() {
  install -Dm755 "$pkgname-$pkgver.AppImage" "$pkgdir/usr/bin/$pkgname"
}
```

**Universal Distribution**:

**AppImageHub**:
- Upload to GitHub Releases
- Submit to [AppImageHub](https://appimage.github.io/)

**Flatpak** (Flathub):
```yaml
# com.threebody.protocol.yaml
app-id: com.threebody.protocol
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: three-body-payment
finish-args:
  - --share=network
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
modules:
  - name: three-body-payment
    buildsystem: simple
    sources:
      - type: file
        url: https://github.com/yourname/3BODYUI/releases/download/v0.0.0/three-body-payment-0.0.0.AppImage
        sha256: SHA256
    build-commands:
      - install -Dm755 three-body-payment-0.0.0.AppImage /app/bin/three-body-payment
```

---

## Beta Testing

### iOS - TestFlight

**Internal Testing**:
1. App Store Connect → TestFlight
2. Internal Testing → Select build
3. Add team members (up to 100)
4. Builds available immediately

**External Testing**:
1. Create external group
2. Add testers (up to 10,000 via public link)
3. Submit for Beta App Review (simpler than App Store)
4. Share public link

**TestFlight Link**: `https://testflight.apple.com/join/YOUR_CODE`

### Android - Play Console

**Internal Testing**:
1. Play Console → Internal testing
2. Upload AAB
3. Add testers by email
4. Share opt-in link

**Closed Testing**:
1. Create closed track
2. Upload AAB
3. Add testers or create Google Group
4. Share link

**Open Testing**:
1. Create open track
2. Upload AAB
3. Anyone can join via Play Store link
4. No review required

### Desktop - GitHub Releases

**Pre-release Strategy**:
1. Create GitHub Release
2. Mark as "Pre-release"
3. Upload all platform binaries
4. Add release notes
5. Share with beta testers

**Release Notes Template**:
```markdown
## 3 Body Payment v0.1.0-beta

### New Features
- Feature 1
- Feature 2

### Bug Fixes
- Fixed issue with wallet connection

### Known Issues
- Issue 1

### Downloads
- [macOS DMG](link)
- [Windows Installer](link)
- [Linux AppImage](link)
```

---

## Auto-Updates

### Desktop Auto-Updates

**Tauri Updater**:

Already configured in `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://api.threebody.protocol/updates"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

**Update Server Requirements**:

Endpoint should return:
```json
{
  "version": "0.0.1",
  "notes": "Release notes...",
  "pub_date": "2024-01-15T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "Base64 encoded signature",
      "url": "https://example.com/3 Body Payment_0.0.1_aarch64.dmg"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "..."
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "..."
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "..."
    }
  }
}
```

**Signing Updates**:

1. Generate key pair:
```bash
tauri signer generate --writable-directory .
```

2. Save private key securely
3. Add public key to `tauri.conf.json`
4. Sign updates with private key

### Mobile Updates

**iOS**: Handled automatically by App Store
**Android**: Handled automatically by Google Play

---

## Security Checklist

Before each release:

### Code Signing
- [ ] iOS: Signed with Distribution certificate
- [ ] iOS: Provisioning profile valid
- [ ] Android: Signed with release keystore
- [ ] macOS: Signed with Developer ID
- [ ] macOS: Notarized
- [ ] Windows: Signed with EV certificate (recommended)

### Testing
- [ ] Tested on clean devices
- [ ] Tested on multiple OS versions
- [ ] Tested all user flows
- [ ] No debug code or console logs in production
- [ ] Crash-free operation verified

### Compliance
- [ ] Privacy policy accessible
- [ ] Terms of service updated
- [ ] App Store metadata accurate
- [ ] Screenshots current
- [ ] Blockchain functionality clearly described

### Security
- [ ] No hardcoded secrets
- [ ] Secure storage for sensitive data
- [ ] Input validation on all forms
- [ ] No debug features in release
- [ ] HTTPS for all network requests

---

## Release Checklist

### Pre-Release
- [ ] Version bumped in all files
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Documentation updated

### Build Phase
- [ ] All platform builds successful
- [ ] All binaries signed
- [ ] File sizes reasonable
- [ ] No antivirus false positives

### Distribution Phase
- [ ] GitHub Release created with all binaries
- [ ] App Store submitted
- [ ] Play Store submitted
- [ ] Homebrew/winget manifests updated
- [ ] Website download links updated

### Post-Release
- [ ] Monitor crash reports
- [ ] Monitor user feedback
- [ ] Check analytics
- [ ] Respond to reviews
- [ ] Plan next release

---

## Related Documentation

- [BUILD.md](./BUILD.md) - Building releases
- [SETUP.md](./SETUP.md) - Environment setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
