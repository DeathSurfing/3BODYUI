# Mobile Development Guide

Specific guidelines and best practices for developing the 3 Body Payment app on iOS and Android platforms.

## Table of Contents

- [Overview](#overview)
- [Mobile UI/UX Guidelines](#mobile-uiux-guidelines)
- [iOS-Specific Considerations](#ios-specific-considerations)
- [Android-Specific Considerations](#android-specific-considerations)
- [Responsive Design](#responsive-design)
- [Mobile Performance](#mobile-performance)
- [Mobile Testing](#mobile-testing)

---

## Overview

### Mobile vs Desktop Differences

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Screen Size | Large (1024px+) | Small (320-428px) |
| Input | Mouse/Keyboard | Touch |
| Performance | More resources | Limited battery/CPU |
| Navigation | Window-based | Stack-based |
| Context | Stationary | On-the-go |

### Mobile-First Approach

Design for mobile first, then enhance for desktop:

1. **Core functionality** works on small screens
2. **Progressive enhancement** for larger screens
3. **Touch-optimized** interactions
4. **Performance-conscious** implementations

---

## Mobile UI/UX Guidelines

### Touch Targets

Minimum touch target size: **44x44 points** (iOS) / **48x48dp** (Android)

```tsx
// Good: Large touch target
<button className="min-h-[48px] min-w-[48px] p-4">
  Connect Wallet
</button>

// Bad: Too small
<button className="h-6 w-6">
  X
</button>
```

### Spacing

```css
/* Mobile spacing scale */
--space-xs: 4px;   /* Minimum spacing */
--space-sm: 8px;   /* Tight spacing */
--space-md: 16px;  /* Default spacing */
--space-lg: 24px;  /* Section spacing */
--space-xl: 32px;  /* Major section spacing */
--space-safe: env(safe-area-inset-bottom); /* iPhone X+ safe area */
```

### Typography

```css
/* Mobile typography */
--text-xs: 12px;   /* Captions, labels */
--text-sm: 14px;   /* Secondary text */
--text-base: 16px; /* Body text (minimum readable) */
--text-lg: 18px;   /* Emphasis */
--text-xl: 20px;   /* Headings */
--text-2xl: 24px;  /* Major headings */
```

### Safe Areas

Handle notches, status bars, and home indicators:

```tsx
// Using Tailwind CSS with safe area utilities
<div className="pb-safe pt-safe">
  {/* Content automatically respects safe areas */}
</div>

// Manual safe area handling
<div style={{
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)'
}}>
  Content
</div>
```

### Navigation Patterns

**Mobile Navigation**:
- Bottom tab bar for primary navigation
- Hamburger menu for secondary items
- Swipe gestures for common actions
- Back button in header

```tsx
// Bottom navigation example
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t pb-safe">
  <div className="flex justify-around py-2">
    <NavItem icon={Home} label="Dashboard" />
    <NavItem icon={Wallet} label="Wallet" />
    <NavItem icon={Settings} label="Settings" />
  </div>
</nav>
```

### Form Inputs

Mobile-optimized forms:

```tsx
// Use appropriate input types for better keyboards
<input 
  type="number"        // Numeric keyboard
  inputMode="decimal"  // Decimal pad
  pattern="[0-9]*"     // iOS numeric keyboard
/>

<input 
  type="text"
  inputMode="email"    // Email keyboard with @ and .
/>

// Larger touch targets for inputs
<input 
  className="min-h-[48px] text-base"
  placeholder="Enter amount"
/>
```

---

## iOS-Specific Considerations

### iOS Design Guidelines

Follow Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

**Key Principles**:
- Clarity: Text legible, icons precise
- Deference: Content first, UI secondary
- Depth: Visual layers and realistic motion

### iOS Navigation

```tsx
// iOS-style navigation bar
<header className="sticky top-0 bg-white/80 backdrop-blur-md border-b z-50">
  <div className="flex items-center justify-between px-4 h-11">
    {/* Back button on left */}
    <button className="text-blue-500">
      ← Back
    </button>
    
    {/* Title centered */}
    <h1 className="font-semibold">3 Body Payment</h1>
    
    {/* Action on right */}
    <button className="text-blue-500">
      Done
    </button>
  </div>
</header>
```

### Dynamic Island & Notch

```css
/* Handle iPhone 14 Pro+ Dynamic Island */
@supports (padding-top: env(safe-area-inset-top)) {
  .ios-header {
    padding-top: max(env(safe-area-inset-top), 44px);
  }
}
```

### iOS Gestures

Handle system gestures:

```tsx
// Prevent conflicts with iOS system gestures
<div 
  className="touch-pan-y"  // Allow vertical scroll only
  onTouchMove={(e) => {
    // Prevent horizontal swipe when needed
    if (shouldPreventSwipe) {
      e.preventDefault();
    }
  }}
>
```

### iOS Status Bar

```tsx
// Control status bar appearance
// In tauri.conf.json:
{
  "app": {
    "windows": [{
      "titleBarStyle": "Transparent", // or "Overlay"
      "hiddenTitle": true
    }]
  }
}
```

### iOS Permissions

Add to `src-tauri/gen/apple/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>3 Body Payment needs camera access to scan QR codes</string>

<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to secure your wallet</string>

<key>NSUserNotificationUsageDescription</key>
<string>Get notified about transaction updates</string>
```

---

## Android-Specific Considerations

### Android Design Guidelines

Follow Google's [Material Design](https://material.io/design)

**Key Principles**:
- Bold, graphic, intentional
- Motion provides meaning
- Flexible foundation
- Cross-platform

### Android Navigation

```tsx
// Android-style app bar (top)
<header className="sticky top-0 bg-indigo-600 text-white shadow-md z-50">
  <div className="flex items-center px-4 h-14">
    {/* Navigation icon */}
    <button className="mr-4">
      <MenuIcon />
    </button>
    
    {/* Title */}
    <h1 className="text-xl font-medium">3 Body Payment</h1>
    
    {/* Actions */}
    <div className="ml-auto flex gap-2">
      <IconButton icon={Search} />
      <IconButton icon={MoreVert} />
    </div>
  </div>
</header>
```

### Android Back Button

Handle hardware back button:

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAndroidBackButton() {
  const router = useRouter();
  
  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      // Custom back button handling
      if (shouldInterceptBack) {
        event.preventDefault();
        // Show confirmation or handle differently
      }
    };
    
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);
}
```

### Android Status Bar

```tsx
// Control Android status bar color
// In CSS or styled-components:

/* Match status bar to app theme */
:root {
  --android-status-bar-color: #1a1a1a;
  --android-navigation-bar-color: #ffffff;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --android-status-bar-color: #000000;
    --android-navigation-bar-color: #121212;
  }
}
```

### Android Permissions

Add to `src-tauri/gen/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

### Android System Navigation

Handle different navigation modes:

```css
/* Account for gesture navigation bar */
.android-safe-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), 16px);
}

/* Three-button navigation */
@supports not (padding-bottom: env(safe-area-inset-bottom)) {
  .android-safe-bottom {
    padding-bottom: 48px; /* Standard nav bar height */
  }
}
```

---

## Responsive Design

### Breakpoint Strategy

```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   /* Small tablets */
  md: '768px',   /* Tablets */
  lg: '1024px',  /* Small laptops */
  xl: '1280px',  /* Desktops */
  '2xl': '1536px' /* Large screens */
};
```

### Mobile-First Approach

```tsx
// Mobile-first responsive component
function TransactionCard({ transaction }: Props) {
  return (
    <div className="
      p-4                    /* Mobile: compact */
      sm:p-6                 /* Tablet: more padding */
      lg:p-8                 /* Desktop: generous padding */
      bg-white
      rounded-lg
      shadow-sm
    ">
      {/* Responsive grid */}
      <div className="
        grid
        grid-cols-1          /* Mobile: stacked */
        sm:grid-cols-2       /* Tablet: 2 columns */
        lg:grid-cols-3       /* Desktop: 3 columns */
        gap-4
      ">
        <Amount value={transaction.amount} />
        <StatusBadge status={transaction.status} />
        <DateTime value={transaction.timestamp} />
      </div>
    </div>
  );
}
```

### Touch vs Hover

```css
/* Show different interactions for touch vs mouse */
.button {
  @apply transition-colors duration-200;
}

/* Hover only on devices with hover capability */
@media (hover: hover) {
  .button:hover {
    @apply bg-gray-100;
  }
}

/* Active state for touch */
@media (hover: none) {
  .button:active {
    @apply bg-gray-200 transform scale-95;
  }
}
```

### Font Scaling

Respect user font size preferences:

```css
/* Use relative units */
body {
  font-size: 100%; /* Respects user preferences */
}

/* Avoid fixed font sizes in px */
/* Good */
.text-base { font-size: 1rem; }

/* Bad - ignores user preferences */
.text-base { font-size: 16px; }
```

---

## Mobile Performance

### Bundle Size Optimization

```typescript
// Lazy load heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false // Disable SSR for chart components
});

// Lazy load Tauri APIs only when needed
async function showNotification() {
  const { notifications } = await import('@/lib/tauri');
  await notifications.show('Title', 'Message');
}
```

### Image Optimization

```tsx
// Use Next.js Image with responsive sizing
<Image
  src="/wallet-icon.png"
  alt="Wallet"
  width={48}
  height={48}
  sizes="(max-width: 768px) 48px, 64px"
  priority={false} /* Don't preload below-fold images */
/>

// Use appropriate image formats
// Mobile: WebP or AVIF
// Fallback: PNG/JPEG
```

### Animation Performance

```css
/* Use GPU-accelerated properties */
.animate-slide {
  transform: translateX(0);
  transition: transform 300ms ease;
  will-change: transform; /* Hint to browser */
}

/* Avoid animating expensive properties */
/* Bad: Causes layout recalculation */
.animate-width {
  transition: width 300ms;
}

/* Good: GPU-accelerated */
.animate-scale {
  transform: scale(1);
  transition: transform 300ms;
}
```

### Memory Management

```tsx
// Clean up event listeners
useEffect(() => {
  const subscription = eventBus.on('transaction', handleTransaction);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);

// Limit list rendering
function TransactionList({ transactions }: Props) {
  const visibleTransactions = useMemo(() => {
    return transactions.slice(0, 50); // Limit to 50 items
  }, [transactions]);
  
  return (
    <VirtualList
      items={visibleTransactions}
      renderItem={renderTransaction}
      itemHeight={80}
    />
  );
}
```

---

## Mobile Testing

### Device Testing Matrix

| Device | OS Version | Priority |
|--------|-----------|----------|
| iPhone 15 Pro | iOS 17 | High |
| iPhone 14 | iOS 17 | High |
| iPhone SE | iOS 17 | Medium |
| iPad Pro | iPadOS 17 | Medium |
| Pixel 8 | Android 14 | High |
| Samsung S23 | Android 14 | High |
| Xiaomi | Android 13 | Medium |
| Low-end Android | Android 10 | Low |

### Simulator/Emulator Testing

**iOS Simulator**:
```bash
# Test on different devices
xcrun simctl list devices

# Launch specific simulator
open -a Simulator --args -CurrentDeviceUDID <DEVICE_UDID>

# Test different OS versions
# Xcode → Window → Devices and Simulators → Simulators
```

**Android Emulator**:
```bash
# Create AVD for testing
avdmanager create avd -n test -k "system-images;android-34;google_apis;x86_64"

# Launch emulator
emulator -avd test

# Test different configurations
# Android Studio → Device Manager → Create Device
```

### Testing Checklist

#### UI/UX
- [ ] Touch targets are 44pt/48dp minimum
- [ ] Content is readable at default font size
- [ ] Safe areas are respected (notch, home indicator)
- [ ] Horizontal scrolling works where needed
- [ ] No horizontal overflow
- [ ] Keyboard doesn't obscure input fields
- [ ] Back navigation works correctly

#### Performance
- [ ] App launches in < 3 seconds
- [ ] Smooth scrolling (60fps)
- [ ] No jank during animations
- [ ] Memory usage stays reasonable
- [ ] Battery drain is acceptable

#### Platform-Specific
- [ ] iOS: Status bar style matches app theme
- [ ] iOS: Swipe-back gesture works
- [ ] Android: Back button handled correctly
- [ ] Android: Status bar color matches
- [ ] Both: Permission requests work

#### Accessibility
- [ ] Screen reader labels present
- [ ] Sufficient color contrast
- [ ] Dynamic type supported (iOS)
- [ ] TalkBack/VoiceOver navigation works

---

## Related Documentation

- [SETUP.md](./SETUP.md) - Environment setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [BUILD.md](./BUILD.md) - Build instructions
