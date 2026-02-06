# Security Guide

Security considerations and best practices for the 3 Body Payment Tauri application.

## Table of Contents

- [Overview](#overview)
- [Security Architecture](#security-architecture)
- [Secure Storage](#secure-storage)
- [Network Security](#network-security)
- [Content Security Policy](#content-security-policy)
- [Mobile Security](#mobile-security)
- [Code Signing](#code-signing)
- [Best Practices](#best-practices)
- [Security Checklist](#security-checklist)

---

## Overview

Security is critical for a DeFi application handling financial transactions. This guide covers security measures at every layer of the application.

### Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Private key theft | Critical | Secure storage, encryption |
| Man-in-the-middle | High | HTTPS, certificate pinning |
| XSS attacks | High | CSP, input sanitization |
| Code injection | High | CSP, no eval() |
| Malicious updates | High | Code signing, updater keys |
| Phishing | Medium | Domain verification |
| Reverse engineering | Medium | Code obfuscation |

---

## Security Architecture

### Layered Security

```
┌─────────────────────────────────────┐
│         Application Layer            │
│  • Input validation                 │
│  • Secure storage API               │
│  • No sensitive data in logs        │
├─────────────────────────────────────┤
│         Bridge Layer                 │
│  • Tauri IPC (isolated)             │
│  • Command validation               │
│  • Permission-based access          │
├─────────────────────────────────────┤
│         Native Layer                 │
│  • Platform secure storage          │
│  • Keychain/Keystore                │
│  • Hardware-backed encryption       │
├─────────────────────────────────────┤
│         OS Layer                     │
│  • App sandboxing                   │
│  • Permission system                │
│  • Code signing                     │
└─────────────────────────────────────┘
```

### Tauri Security Features

Tauri provides several built-in security mechanisms:

1. **Isolated WebView**: Frontend runs in isolated process
2. **IPC Bridge**: All native calls go through Tauri's IPC
3. **CSP Enforcement**: Content Security Policy blocks malicious scripts
4. **Permission System**: Capabilities define allowed operations
5. **No Node.js**: No server-side code execution in production

---

## Secure Storage

### Overview

Sensitive data (private keys, mnemonic phrases, authentication tokens) must be stored using platform-native secure storage:

| Platform | Storage | Encryption |
|----------|---------|------------|
| iOS | Keychain Services | Hardware-backed (Secure Enclave) |
| Android | Android Keystore | Hardware-backed (TEE/StrongBox) |
| macOS | Keychain | Hardware-backed |
| Windows | Credential Manager | DPAPI (user-bound) |
| Linux | Secret Service | Session-based |

### Implementation

**Current Setup** (placeholder commands in `src-tauri/src/lib.rs`):

```rust
#[tauri::command]
pub async fn secure_store(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    // TODO: Full integration with secure storage plugins
    // Implementation will use:
    // - iOS: Security framework (SecItemAdd)
    // - Android: Keystore system
    // - Desktop: keyring crate
    println!("Storing key: {} (value hidden)", key);
    Ok(())
}
```

**Full Integration Plan**:

Add to `Cargo.toml`:
```toml
[dependencies]
tauri-plugin-secure-storage = "2"
```

Implementation:
```rust
use tauri_plugin_secure_storage::SecureStorageExt;

#[tauri::command]
pub async fn secure_store(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let store = app.secure_storage();
    store.set(key, value)
        .map_err(|e| format!("Storage error: {}", e))
}
```

### What to Store Securely

✅ **Store in Secure Storage**:
- Wallet private keys
- Mnemonic phrases (seed words)
- Authentication tokens
- API keys
- User passwords
- Biometric authentication tokens

❌ **Don't Store Securely** (use regular storage):
- User preferences (theme, language)
- Cached data
- Transaction history (can be public)
- Public wallet addresses

### Migration Strategy

When implementing full secure storage:

1. **Phase 1**: Detect existing localStorage data
2. **Phase 2**: Migrate to secure storage
3. **Phase 3**: Clear from localStorage
4. **Phase 4**: Remove migration code

```typescript
// Migration example
async function migrateToSecureStorage() {
  const oldKey = localStorage.getItem('wallet_key');
  if (oldKey) {
    await secureStorage.set('wallet_key', oldKey);
    localStorage.removeItem('wallet_key');
    console.log('Migrated wallet key to secure storage');
  }
}
```

---

## Network Security

### HTTPS Enforcement

All network requests must use HTTPS:

```typescript
// Frontend: Validate URLs
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Never send sensitive data over HTTP
if (!validateUrl(apiEndpoint)) {
  throw new Error('API endpoint must use HTTPS');
}
```

### Certificate Pinning (Future)

For production apps, consider certificate pinning:

```rust
// Rust backend: Pin specific certificates
// This prevents MITM attacks even if CA is compromised

#[tauri::command]
pub async fn secure_request(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .add_root_certificate(Certificate::from_pem(PEM)?)
        .build()
        .map_err(|e| e.to_string())?;
    
    // Make request with pinned certificate
}
```

### API Security

**Current API Routes** (Next.js):
- Run in serverless environment
- Should validate authentication
- Rate limiting recommended

**Security Headers**:

```typescript
// middleware.ts or next.config.ts
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

---

## Content Security Policy

### Current CSP Configuration

```json
{
  "app": {
    "security": {
      "csp": {
        "default-src": "'self'",
        "connect-src": "'self' ipc: http://ipc.localhost https:",
        "img-src": "'self' data: https:",
        "style-src": "'self' 'unsafe-inline'",
        "script-src": "'self' 'wasm-unsafe-eval'"
      }
    }
  }
}
```

### Policy Explanation

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Only allow resources from same origin |
| `connect-src` | `'self' ipc: https:` | Allow API calls and IPC |
| `img-src` | `'self' data: https:` | Allow images from app and HTTPS |
| `style-src` | `'self' 'unsafe-inline'` | Allow inline styles (needed by Tailwind) |
| `script-src` | `'self' 'wasm-unsafe-eval'` | Block inline scripts, allow WASM |

### Removing 'unsafe-inline' from Style

For stricter security, avoid inline styles:

```css
/* Use CSS classes instead of style attributes */
/* Bad */
<div style={{ color: 'red' }}>Text</div>

/* Good */
<div className="text-red-500">Text</div>
```

Then update CSP:
```json
{
  "style-src": "'self'"  // Remove 'unsafe-inline'
}
```

### Script Security

**Never use**:
```typescript
// ❌ Dangerous - allows code injection
eval(userInput);
new Function(userInput);
setTimeout(userInput, 1000);

// ❌ Inline event handlers
<button onclick="handleClick()">Click</button>

// ❌ document.write()
document.write(userContent);
```

**Always use**:
```typescript
// ✅ Safe function calls
const handleClick = () => { /* ... */ };
<button onClick={handleClick}>Click</button>

// ✅ Sanitized innerHTML with DOMPurify
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userContent);
```

---

## Mobile Security

### iOS Security

**Keychain Access Groups**:
```xml
<!-- Entitlements.plist -->
<key>keychain-access-groups</key>
<array>
  <string>$(AppIdentifierPrefix)com.threebody.protocol</string>
</array>
```

**App Transport Security (ATS)**:
```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <!-- Only allow specific domains if needed -->
    <key>api.threebody.protocol</key>
    <dict>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.3</string>
    </dict>
  </dict>
</dict>
```

**Jailbreak Detection** (optional):
```rust
#[cfg(target_os = "ios")]
pub fn is_jailbroken() -> bool {
    // Check for jailbreak indicators
    // This is not foolproof but helps
    std::path::Path::new("/Applications/Cydia.app").exists()
}
```

### Android Security

**Network Security Config**:
```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">api.threebody.protocol</domain>
  </domain-config>
</network-security-config>
```

**Root Detection** (optional):
```rust
#[cfg(target_os = "android")]
pub fn is_rooted() -> bool {
    // Check for root indicators
    std::path::Path::new("/system/bin/su").exists() ||
    std::path::Path::new("/system/xbin/su").exists()
}
```

**ProGuard/R8** (for release builds):
```proguard
# Keep Tauri classes
-keep class com.tauri.** { *; }
-keepclassmembers class com.tauri.** { *; }

# Obfuscate other code
```

---

## Code Signing

### Why Code Signing Matters

1. **Identity Verification**: Users know who built the app
2. **Tamper Detection**: Modified code invalidates signature
3. **Trust**: OS treats signed apps as more trustworthy
4. **Distribution**: Required for app stores

### Signing Strategy

| Platform | Certificate Type | Validity |
|----------|-----------------|----------|
| iOS | Apple Distribution | 1 year |
| macOS | Developer ID | 5 years |
| Android | Self-signed or Play Signing | 25+ years |
| Windows | EV Code Signing | 1-3 years |

### Private Key Security

**Never commit private keys to git**:

```bash
# Add to .gitignore
*.p12
*.pfx
*.keystore
*.jks
*.mobileprovision
signing/
```

**Secure storage options**:
- macOS: Keychain
- Hardware security modules (HSM)
- Cloud key management (AWS KMS, Google Cloud KMS)
- CI/CD secrets (GitHub Actions, GitLab CI)

### CI/CD Signing

**GitHub Actions Example**:
```yaml
- name: Import macOS certificate
  uses: apple-actions/import-codesign-certs@v2
  with:
    p12-file-base64: ${{ secrets.MACOS_CERTIFICATE }}
    p12-password: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}

- name: Import Android keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE }}" | base64 -d > android.keystore
```

---

## Best Practices

### Input Validation

**Always validate user input**:

```typescript
// Wallet address validation
function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Amount validation
function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < 1000000000;
}

// Sanitize before display
function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '');
}
```

### Error Handling

**Don't leak sensitive info in errors**:

```rust
// ❌ Bad - exposes internal details
#[tauri::command]
pub async fn secure_store(key: String, value: String) -> Result<(), String> {
    match storage.set(&key, &value) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Database connection failed at {}: {:?}", DB_PATH, e)),
    }
}

// ✅ Good - generic error message
#[tauri::command]
pub async fn secure_store(key: String, value: String) -> Result<(), String> {
    match storage.set(&key, &value) {
        Ok(_) => Ok(()),
        Err(_) => Err("Failed to store value".to_string()),
    }
}
```

### Logging

**Never log sensitive data**:

```typescript
// ❌ Bad
console.log('Private key:', privateKey);
console.log('User data:', user);

// ✅ Good
console.log('Wallet connected');
console.log('Transaction created:', { id: tx.id, status: tx.status });
```

### Dependencies

**Keep dependencies updated**:

```bash
# Check for vulnerabilities
cd 3bodyui
bun audit

cd ../src-tauri
cargo audit
```

**Pin critical dependencies**:
```toml
# Cargo.toml - use exact versions for security-critical crates
tauri = "=2.0.0"
```

### Secure Defaults

**Configuration**:
```json
{
  "app": {
    "security": {
      "dangerousRemoteDomainIpcAccess": [],
      "dangerousUseHttpScheme": false
    }
  }
}
```

---

## Security Checklist

### Development Phase

- [ ] No hardcoded secrets in code
- [ ] All dependencies scanned for vulnerabilities
- [ ] Input validation on all user inputs
- [ ] Sensitive data not logged
- [ ] Error messages don't leak internals
- [ ] CSP configured and tested
- [ ] HTTPS enforced for all network calls

### Build Phase

- [ ] Code signing configured for all platforms
- [ ] Private keys stored securely (not in git)
- [ ] Release builds don't include debug features
- [ ] No console.log statements in production
- [ ] Source maps excluded from release
- [ ] Dependencies updated to latest secure versions

### Distribution Phase

- [ ] App store privacy policy included
- [ ] Only necessary permissions requested
- [ ] App store screenshots don't show sensitive data
- [ ] Beta testing completed with security focus
- [ ] Penetration testing performed (recommended)
- [ ] Security incident response plan in place

### Runtime Security

- [ ] Secure storage used for all sensitive data
- [ ] Biometric authentication implemented (if available)
- [ ] Session timeouts configured
- [ ] Automatic lock after inactivity
- [ ] Secure clipboard handling (clear after paste)
- [ ] Screenshot protection for sensitive screens

---

## Security Incident Response

### If Private Key is Compromised

1. **Immediately** create new wallet
2. **Transfer all funds** to new wallet
3. **Revoke all approvals** from compromised wallet
4. **Update secure storage** with new key
5. **Notify users** if applicable
6. **Investigate** how compromise occurred

### Reporting Security Issues

Create a `SECURITY.md` file:

```markdown
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to security@threebody.protocol

## Response Timeline

- Acknowledgment: 24 hours
- Initial assessment: 72 hours
- Fix timeline: Depends on severity

## Scope

- Smart contract vulnerabilities
- Private key extraction
- Authentication bypass
- Data leakage
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SETUP.md](./SETUP.md) - Environment setup
- [BUILD.md](./BUILD.md) - Building releases
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Distribution
